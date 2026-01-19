import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

const DRAFT_PREFIX = "[DRAFT] ";
const SKIP_PREFIX = "[SKIP] ";
const DESCRIPTION_BASE = "Video assignments for Kinder classes are generated automatically each week.";

type Action = "publish" | "change_date" | "skip";

type KinderWeekMeta = {
  title: string;
  moduleName: string;
  dueDate: string;
};

function computeKinderWeekMeta(now: Date): KinderWeekMeta {
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
  const title = `Week ${weekNum} Reading`;
  const moduleName = `Week ${weekNum}`;

  const dayOfWeek = now.getDay();
  const daysUntilSunday = 7 - dayOfWeek;
  const due = new Date(now);
  due.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  const dueDate = due.toISOString().split("T")[0];

  return { title, moduleName, dueDate };
}

async function fetchKinderClasses() {
  const { data, error } = await supabaseService
    .from("classes")
    .select("name")
    .eq("campus", "International");
  if (error) throw error;
  const names = (data || [])
    .map((row: any) => String(row.name || "").trim())
    .filter((v) => v.length > 0);
  return Array.from(new Set(names));
}

async function ensureAssignmentsExists(classNames: string[], meta: KinderWeekMeta, description: string) {
  if (classNames.length === 0) return [];
  const { data } = await supabaseService
    .from("video_assignments")
    .select("*")
    .in("class_name", classNames)
    .eq("title", meta.title)
    .eq("campus", "International");
  const existing = Array.isArray(data) ? data : [];
  const existingByClass = new Set(existing.map((row: any) => String(row.class_name || "").trim()));

  const inserts = classNames
    .filter((name) => !existingByClass.has(name))
    .map((name) => ({
      title: meta.title,
      module: meta.moduleName,
      description,
      due_date: meta.dueDate,
      class_name: name,
      campus: "International",
    }));

  if (inserts.length > 0) {
    const { data: inserted } = await supabaseService
      .from("video_assignments")
      .insert(inserts)
      .select("*");
    return [...existing, ...(Array.isArray(inserted) ? inserted : [])];
  }

  return existing;
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    let role = user.app_metadata?.role ?? "parent";

    // Fallback: Check teachers table
    if (role === "parent") {
      const { data: teacher } = await supabaseService
        .from("teachers")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (teacher?.role) {
        role = teacher.role;
      }
    }

    // Fallback: Master teacher email
    if (user.email === "master_teacher@frage.com") {
      role = "master_teacher";
    }

    if (!["teacher", "master_teacher", "admin", "master_admin"].includes(role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "") as Action;
    const date = typeof body.date === "string" ? body.date : "";

    if (!["publish", "change_date", "skip"].includes(action)) {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    if (action === "change_date" && !date) {
      return NextResponse.json({ error: "missing_date" }, { status: 400 });
    }

    const now = new Date();
    const meta = computeKinderWeekMeta(now);
    const classNames = await fetchKinderClasses();

    if (classNames.length === 0) {
      return NextResponse.json({ ok: true, message: "no_kinder_classes" }, { status: 200 });
    }

    if (action === "publish") {
      const assignments = await ensureAssignmentsExists(classNames, meta, DESCRIPTION_BASE);
      if (assignments.length === 0) {
        return NextResponse.json({ ok: true, updated: 0 }, { status: 200 });
      }
      const ids = assignments.map((row: any) => row.id).filter((id) => id != null);
      if (ids.length === 0) {
        return NextResponse.json({ ok: true, updated: 0 }, { status: 200 });
      }
      await supabaseService
        .from("video_assignments")
        .update({
          description: DESCRIPTION_BASE,
        })
        .in("id", ids);
      if (date) {
        await supabaseService
          .from("video_assignments")
          .update({ due_date: date })
          .in("id", ids);
      }
      return NextResponse.json({ ok: true, updated: ids.length }, { status: 200 });
    }

    if (action === "change_date") {
      const assignments = await ensureAssignmentsExists(classNames, meta, `${DRAFT_PREFIX}${DESCRIPTION_BASE}`);
      const ids = assignments.map((row: any) => row.id).filter((id) => id != null);
      if (ids.length === 0) {
        return NextResponse.json({ ok: true, updated: 0 }, { status: 200 });
      }
      await supabaseService
        .from("video_assignments")
        .update({ due_date: date, description: `${DRAFT_PREFIX}${DESCRIPTION_BASE}` })
        .in("id", ids);
      return NextResponse.json({ ok: true, updated: ids.length }, { status: 200 });
    }

    if (action === "skip") {
      const assignments = await ensureAssignmentsExists(classNames, meta, `${SKIP_PREFIX}${DESCRIPTION_BASE}`);
      const ids = assignments.map((row: any) => row.id).filter((id) => id != null);
      if (ids.length === 0) {
        return NextResponse.json({ ok: true, updated: 0 }, { status: 200 });
      }
      await supabaseService
        .from("video_assignments")
        .update({ description: `${SKIP_PREFIX}${DESCRIPTION_BASE}` })
        .in("id", ids);
      return NextResponse.json({ ok: true, updated: ids.length }, { status: 200 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
