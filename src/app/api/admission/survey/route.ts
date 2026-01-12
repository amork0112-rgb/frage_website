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
    console.log("SURVEY BODY", body);

    const {
      studentId,
      grade,
      currentSchool,
      englishHistory,
      officialScore,
      srScore,
      leadSources,
      leadEtc,
      referralName,
      interestReasons,
      expectations,
      concerns,
    } = body;

    // 필수 필드 체크 (빈 문자열 or undefined)
    if (
      !studentId?.trim() ||
      !grade?.trim() ||
      !currentSchool?.trim() ||
      !englishHistory?.trim() ||
      !expectations?.trim()
    ) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 변수 매핑 및 안전한 값 처리
    const safeLeadSources = Array.isArray(leadSources) ? leadSources : [];
    const safeInterestReasons = Array.isArray(interestReasons) ? interestReasons : [];

    console.log("UPSERT PAYLOAD", {
      new_student_id: String(studentId),
      grade,
      current_school: currentSchool,
      english_history: englishHistory,
      official_score: officialScore || null,
      sr_score: srScore || null,
      lead_sources: safeLeadSources,
      lead_etc: leadEtc || null,
      referral_name: referralName || null,
      interest_reasons: safeInterestReasons,
      expectations,
      concerns: concerns || null,
    });

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

          lead_sources: safeLeadSources,
          lead_etc: leadEtc || null,
          referral_name: referralName || null,

          interest_reasons: safeInterestReasons,
          expectations,
          concerns: concerns || null,
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
