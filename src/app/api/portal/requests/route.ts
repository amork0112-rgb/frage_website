import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return json({ ok: false, items: [] }, 401);
    }

    // Role check - optional if RLS handles it, but good for fail-fast
    const role = user.app_metadata?.role ?? "parent";
    if (role !== "parent") {
      return json({ ok: false, items: [] }, 403);
    }

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "");

    if (!studentId) {
      return json({ ok: true, items: [] }, 200);
    }

    // 1. Get Parent ID
    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!parent) {
      return json({ ok: true, items: [] }, 200);
    }

    // 2. Validate Student Ownership (Parent -> Student)
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("parent_id", parent.id)
      .maybeSingle();

    if (!student) {
      return json({ ok: true, items: [] }, 200);
    }

    // 3. Fetch Requests
    const { data, error } = await supabase
      .from("portal_requests")
      .select("id,type,payload,created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      return json({ ok: false, items: [] }, 200);
    }

    const rows = Array.isArray(data) ? data : [];
    const items = rows.map((row: any) => ({
      id: String(row.id ?? ""),
      date: String(row?.payload?.dateStart || row?.created_at || ""),
      type: String(row.type || "absence"),
    }));

    return json({ ok: true, items }, 200);
  } catch {
    return json({ ok: false, items: [] }, 200);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    const role = user.app_metadata?.role ?? "parent";
    if (role !== "parent") {
      return json({ ok: false, error: "forbidden" }, 403);
    }

    const body = await req.json();
    const studentId = String(body?.studentId || "");
    const rawType = String(body?.type || "");
    const payload = body?.payload ?? null;

    if (!studentId || !rawType || !payload) {
      return json({ ok: false, error: "invalid_payload" }, 400);
    }

    const allowedTypes = ["absence", "early_pickup", "bus_change", "medication"];
    const type = allowedTypes.includes(rawType) ? rawType : "";
    if (!type) {
      return json({ ok: false, error: "invalid_type" }, 400);
    }

    // 1. Get Parent ID
    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!parent) {
      return json({ ok: false, error: "parent_not_found" }, 403);
    }

    // 2. Validate Student Ownership (Parent -> Student)
    const { data: student } = await supabase
      .from("students")
      .select("id,campus,parent_id,teacher_id")
      .eq("id", studentId)
      .eq("parent_id", parent.id)
      .maybeSingle();

    if (!student) {
      return json({ ok: false, error: "student_not_found" }, 403);
    }

    const now = new Date().toISOString();
    const campus = String((student as any).campus || "All");
    const teacherId = (student as any).teacher_id || null;

    const row: any = {
      student_id: studentId,
      type,
      payload,
      campus,
      status: "pending",
      created_at: now,
    };

    if (teacherId) {
      row.teacher_id = teacherId;
    }

    // Insert Request
    // Use supabase (auth) if RLS permits, otherwise fallback to service if needed.
    // Assuming portal_requests has RLS for parents to insert.
    const { error } = await supabaseService.from("portal_requests").insert(row);
    if (error) {
      return json({ ok: false, error: "db_error" }, 500);
    }

    return json({ ok: true }, 200);
  } catch {
    return json({ ok: false, error: "server_error" }, 500);
  }
}

