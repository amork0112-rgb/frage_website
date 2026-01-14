import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = createSupabaseServer();
    const body = await request.json();
    const { studentId, classId } = body; // classId can be null

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    // v_students_full 뷰는 students 테이블 변경 시 자동 반영됨
    const { error } = await supabase
      .from("students")
      .update({ main_class: classId }) // classId가 null이면 반 배정 취소
      .eq("id", studentId);

    if (error) {
      console.error("Class update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
