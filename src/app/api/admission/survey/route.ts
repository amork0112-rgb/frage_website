import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      new_student_id,
      grade,
      current_school,
      english_history,
      official_score,
      sr_score,
      available_days,
      expectations,
      concerns,
    } = body;

    if (
      !new_student_id ||
      !grade ||
      !current_school ||
      !english_history ||
      !expectations
    ) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 변수 매핑 및 안전한 값 처리
    const stu = { id: new_student_id };
    const currentSchool = current_school;
    const englishHistory = english_history;
    const officialScore = official_score || null;
    const srScore = sr_score || null;
    const availableDays = typeof available_days === "string" ? available_days : null;

    // payload (이대로 써)
    const { error: upErr } = await supabaseService
      .from("admission_extras")
      .upsert(
        {
          new_student_id: String(stu.id),
          grade,
          current_school: currentSchool,
          english_history: englishHistory, // ❗ 컬럼명 정확히
          official_score: officialScore,
          sr_score: srScore,
          available_days: availableDays,
          expectations,
          concerns: concerns || null,
          created_at: now,      // ✅ 필수
          updated_at: now,      // ✅ 필수
          created_by: user.id,  // ✅ 필수
        },
        { onConflict: "new_student_id" }
      );

    if (upErr) {
      // 4️⃣ 에러 메시지 보안 처리 (서버 로그엔 상세히, 클라이언트엔 일반 메시지)
      console.error("SURVEY_SUBMIT_ERROR:", upErr);
      return NextResponse.json(
        { ok: false, error: "Submission failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("SURVEY_API_UNEXPECTED_ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
