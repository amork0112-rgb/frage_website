import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  
  if (!studentId) {
    return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
  }

  const supabase = createSupabaseServer();
  
  // 먼저 student_consults 테이블 조회 시도
  const { data, error } = await supabase
    .from("student_consults")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    // 테이블이 없거나 권한 에러 등
    console.error("Fetch consults error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServer();
    const body = await request.json();
    const { student_id, content, created_by } = body;

    if (!student_id || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { error } = await supabase
      .from("student_consults")
      .insert({
        student_id,
        content,
        created_by: created_by || "시스템" // created_by가 없으면 기본값
      });

    if (error) {
      console.error("Insert consult error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
