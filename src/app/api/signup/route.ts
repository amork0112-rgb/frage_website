//src/app/api/signup
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
// RLS enforced: use SSR client only

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      studentName,
      gender,
      parentName,
      phone,
      campus,
      passportEnglishName,
      englishFirstName,
      childBirthDate,
      status,
      mode,
      privacyAgreed,
    } = body || {};

    const supabaseAuth = createSupabaseServer();
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "인증 정보 없음" },
        { status: 401 }
      );
    }

    const authUserId = user.id;
    try {
      await supabaseService.auth.admin.updateUserById(authUserId, {
        app_metadata: { role: "parent" },
      });
    } catch {}

    

    /* -------------------------
       2️⃣ 기본 유효성 검사 (waiting)
    -------------------------- */
    if (privacyAgreed !== true) {
      return NextResponse.json(
        { ok: false, error: "privacy_required" },
        { status: 400 }
      );
    }
    if (
      !studentName ||
      (gender !== "M" && gender !== "F") ||
      !parentName ||
      !phone ||
      !campus ||
      !passportEnglishName ||
      !englishFirstName ||
      !childBirthDate
    ) {
      return NextResponse.json(
        { ok: false, error: "필수 항목 누락" },
        { status: 400 }
      );
    }

    const passOk = /^[A-Z][A-Z\s-]{0,49}$/.test(passportEnglishName);
    const firstOk = /^[A-Za-z][A-Za-z\s-]{0,29}$/.test(englishFirstName);
    const dob = new Date(childBirthDate);
    const today = new Date();

    if (
      !passOk ||
      !firstOk ||
      Number.isNaN(dob.getTime()) ||
      dob >= new Date(today.getFullYear(), today.getMonth(), today.getDate())
    ) {
      return NextResponse.json(
        { ok: false, error: "유효성 검사 실패" },
        { status: 400 }
      );
    }

    /* -------------------------
       3️⃣ parents 생성 또는 조회 (waiting)
    -------------------------- */
    let parentId: string;

    const { data: existingParent } = await supabaseAuth
      .from("parents")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();

    if (existingParent) {
      parentId = existingParent.id;
    } else {
      const { data: newParent, error: parentError } = await supabaseAuth
        .from("parents")
        .insert({
          auth_user_id: authUserId,
          name: parentName,
          phone,
          campus,
        })
        .select()
        .single();

      if (parentError || !newParent) {
        return NextResponse.json(
          { ok: false, error: "parents 생성 실패" },
          { status: 500 }
        );
      }

      parentId = newParent.id;
    }

    const now = new Date().toISOString();
    const { error: insertErr } = await supabaseService
      .from("new_students")
      .insert({
        parent_id: parentId,
        parent_auth_user_id: authUserId,
        student_name: studentName,
        gender,
        parent_name: parentName,
        phone,
        campus,
        english_first_name: englishFirstName,
        passport_english_name: passportEnglishName,
        child_birth_date: childBirthDate,
        status: "waiting",
        created_at: now,
        created_by: authUserId,
      });
    if (insertErr) {
      return NextResponse.json(
        { ok: false, error: "new_students_insert_failed" },
        { status: 500 }
      );
    }

    /* -------------------------
       5️⃣ 성공 응답
    -------------------------- */
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "서버 오류" },
      { status: 500 }
    );
  }
}
