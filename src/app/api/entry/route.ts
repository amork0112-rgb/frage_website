import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ redirect: "/portal" }, { status: 200 });
    }
    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role === "master_admin" || role === "admin") {
      return NextResponse.json({ redirect: "/admin/home" }, { status: 200 });
    }
    if (role === "teacher" || role === "master_teacher") {
      return NextResponse.json({ redirect: "/teacher/home" }, { status: 200 });
    }
    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!parent) {
      return NextResponse.json({ redirect: "/portal/home" }, { status: 200 });
    }
    const parentId = String(parent.id);
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("parent_id", parentId)
      .limit(1);
    const hasStudents = Array.isArray(students) && students.length > 0;
    return NextResponse.json({ redirect: "/portal/home" }, { status: 200 });
  } catch {
    return NextResponse.json({ redirect: "/portal/home" }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role !== "parent") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const student_name = String(body?.student_name || "").trim();
    const birth_date_raw = String(body?.birth_date || "").trim();
    const campus = String(body?.campus || "").trim();
    const parent_name = String(body?.parent_name || "").trim();
    const phone = String(body?.phone || "").trim();

    if (!student_name || !birth_date_raw || !campus || !parent_name || !phone) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }
    const dob = new Date(birth_date_raw);
    const today = new Date();
    if (Number.isNaN(dob.getTime()) || dob >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      return NextResponse.json({ ok: false, error: "invalid_birth_date" }, { status: 400 });
    }

    const { data: parent } = await supabaseService
      .from("parents")
      .select("id,name,phone,campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    let parentId: string | null = parent ? String(parent.id) : null;
    if (!parentId) {
      const { data: created } = await supabaseService
        .from("parents")
        .insert({
          auth_user_id: user.id,
          name: parent_name,
          phone,
          campus,
        })
        .select("id")
        .maybeSingle();
      parentId = created ? String(created.id) : null;
    }
    if (!parentId) {
      return NextResponse.json({ ok: false, error: "parent_create_failed" }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { error: insertErr } = await supabaseService
      .from("new_students")
      .insert({
        parent_id: parentId,
        parent_auth_user_id: user.id,
        student_name,
        child_birth_date: birth_date_raw,
        parent_name,
        phone,
        campus,
        status: "waiting",
        created_at: now,
        created_by: user.id,
      });
    if (insertErr) {
      return NextResponse.json({ ok: false, error: "new_student_insert_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
