import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

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
    
    // 3️⃣ available_days 타입 보완 (string 아니면 null)
    const safeAvailableDays = typeof available_days === "string" ? available_days : null;

    // 공통 Payload (updated_at 포함)
    const basePayload = {
      grade,
      current_school,
      english_history,
      official_score: official_score || null,
      sr_score: sr_score || null,
      available_days: safeAvailableDays,
      expectations,
      concerns: concerns || null,
      updated_at: now,
    };

    // 2️⃣ insert/update 분리 (created_by 덮어쓰기 방지)
    const { data: existing } = await supabase
      .from("admission_extras")
      .select("id")
      .eq("new_student_id", new_student_id)
      .maybeSingle();

    let error;

    if (existing) {
      // Update: created_at, created_by 제외
      const { error: updateErr } = await supabase
        .from("admission_extras")
        .update(basePayload)
        .eq("new_student_id", new_student_id);
      error = updateErr;
    } else {
      // Insert: created_at, created_by 포함 (1️⃣ created_at 추가)
      const { error: insertErr } = await supabase
        .from("admission_extras")
        .insert({
          ...basePayload,
          new_student_id,
          created_by: user.id,
          created_at: now,
        });
      error = insertErr;
    }

    if (error) {
      // 4️⃣ 에러 메시지 보안 처리 (서버 로그엔 상세히, 클라이언트엔 일반 메시지)
      console.error("SURVEY_SUBMIT_ERROR:", error);
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
