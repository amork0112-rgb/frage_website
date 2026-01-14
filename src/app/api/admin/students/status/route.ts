import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = createSupabaseServer();
    const body = await request.json();
    const { studentId, status } = body;

    if (!studentId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // students_status_check 제약조건에 맞는 값인지 확인은 DB가 알아서 에러를 뱉겠지만,
    // 클라이언트에서 미리 필터링해서 보냄.
    
    const { error } = await supabase
      .from("students")
      .update({ status })
      .eq("id", studentId);

    if (error) {
      console.error("Status update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
