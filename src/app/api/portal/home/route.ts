import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role !== "parent") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: parent } = await supabase
      .from("parents")
      .select("id,name,phone,campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!parent) {
      return NextResponse.json({ ok: true, type: "no_parent" }, { status: 200 });
    }

    const parentId = String(parent.id);

    const { data: students } = await supabase
      .from("students")
      .select("id,name,english_name,status,class_name,campus,parent_account_id")
      .eq("parent_id", parentId);

    if (Array.isArray(students) && students.length > 0) {
      const items = students.map((s: any) => ({
        id: String(s.id || ""),
        name: String(s.name || ""),
        englishName: String(s.english_name || ""),
        status: String(s.status || ""),
        className: String(s.class_name || ""),
        campus: String(s.campus || ""),
        parentAccountId: String(s.parent_account_id || ""),
      }));
      return NextResponse.json({ ok: true, type: "enrolled", students: items }, { status: 200 });
    }

    const { data: newStudentRows } = await supabase
      .from("new_students")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false })
      .limit(1);

    const newStudent = Array.isArray(newStudentRows) && newStudentRows.length > 0 ? newStudentRows[0] : null;

    const status = String(newStudent?.status || "");
    const progressStep =
      status === "waiting"
        ? "상담 대기"
        : status === "consultation_confirmed"
        ? "상담 일정 확정"
        : status === "admission_open"
        ? "입학 서류 작성"
        : status === "admitted"
        ? "입학 완료"
        : "대기";

    return NextResponse.json(
      { ok: true, type: "new_student", newStudent, progressStep },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
