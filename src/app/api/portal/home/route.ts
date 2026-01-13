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

    // 1. Fetch Enrolled Students (Promoted)
    const { data: enrolledStudents } = await supabase
      .from("v_students_full")
      .select("id,student_name,english_first_name,status,grade,campus,parent_user_id")
      .eq("parent_id", parentId);

    // 2. Fetch New Students (Applicants, excluding promoted)
    const { data: newStudents } = await supabase
      .from("new_students")
      .select("id,student_name,english_first_name,status,campus,created_at")
      .eq("parent_id", parentId)
      .neq("status", "promoted");

    const enrolledItems = Array.isArray(enrolledStudents)
      ? enrolledStudents.map((s: any) => ({
          id: String(s.id || ""),
          name: String(s.student_name || ""),
          englishName: String(s.english_first_name || ""),
          status: String(s.status || "promoted"), // Should be promoted
          className: String(s.grade || ""),
          campus: String(s.campus || ""),
          parentAccountId: String(s.parent_user_id || ""),
          type: "enrolled"
        }))
      : [];

    const newItems = Array.isArray(newStudents)
      ? newStudents.map((s: any) => ({
          id: String(s.id || ""),
          name: String(s.student_name || ""),
          englishName: String(s.english_first_name || ""),
          status: String(s.status || "waiting"),
          className: "",
          campus: String(s.campus || ""),
          parentAccountId: user.id,
          type: "applicant"
        }))
      : [];

    const items = [...enrolledItems, ...newItems];

    return NextResponse.json({ ok: true, students: items }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
