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
      studentId,
      grade,
      currentSchool,
      englishHistory,
      officialScore,
      srScore,
      availableDays,
      leadSources,
      leadEtc,
      referralName,
      interestReasons,
      expectations,
      concerns,
    } = body;

    // studentId 필수 체크
    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 변수 매핑 및 안전한 값 처리
    const safeAvailableDays = typeof availableDays === "string" ? availableDays : null;
    const safeLeadSources = Array.isArray(leadSources) ? leadSources : [];
    const safeInterestReasons = Array.isArray(interestReasons) ? interestReasons : [];

    // payload (이대로 써)
    const { error: upErr } = await supabaseService
      .from("admission_extras")
      .upsert(
        {
          new_student_id: String(studentId),
          grade,
          current_school: currentSchool,
          english_history: englishHistory,
          official_score: officialScore || null,
          sr_score: srScore || null,
          available_days: safeAvailableDays,

          lead_sources: safeLeadSources,
          lead_etc: leadEtc || null,
          referral_name: referralName || null,

          interest_reasons: safeInterestReasons,
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
