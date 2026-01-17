import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ items: [] }, { status: 401 });
    }
    const role = user.app_metadata?.role ?? "parent";
    if (role !== "parent") {
      return NextResponse.json({ items: [] }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "");
    if (!studentId) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("portal_notifications")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const rows = Array.isArray(data) ? data : [];
    const items = rows.map((row: any) => {
      const id = String(row.id ?? "");
      const message = String(row.message ?? row.text ?? "");
      const created = String(row.created_at ?? new Date().toISOString());
      const ymd = created.slice(0, 10);
      const date = ymd ? ymd.replace(/-/g, ".") : created;
      return { id, message, date };
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const role = user.app_metadata?.role ?? "parent";
    const adminRoles = ["admin", "master_admin"];
    if (!adminRoles.includes(role)) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const body = await req.json();
    const studentId = String(body?.studentId || "");
    const message = String(body?.message || "");
    if (!studentId || !message) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from("portal_notifications").insert({
      student_id: studentId,
      message,
      created_at: now,
    });
    if (error) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

