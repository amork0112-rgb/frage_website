import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
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
    } = body || {};

    /* -------------------------
       1️⃣ 기본 유효성 검사
    -------------------------- */
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

    const supabaseAuth = createSupabaseServer();
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "인증 정보 없음" },
        { status: 401 }
      );
    }

    const authUserId = user.id;

    /* -------------------------
       3️⃣ parents 생성 또는 조회
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

    /* -------------------------
       4️⃣ 기존 draft → waiting 전환 (RPC)
    -------------------------- */
    const { data: draftRow } = await supabaseAuth
      .from("new_students")
      .select("id,status")
      .eq("parent_id", parentId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1);
    const draft = Array.isArray(draftRow) && draftRow.length > 0 ? draftRow[0] : null;
    if (draft?.id) {
      const { error: rpcErr } = await supabaseAuth.rpc("draft_to_waiting", {
        new_student_id: draft.id,
        student_name: studentName,
      });
      if (rpcErr) {
        return NextResponse.json(
          { ok: false, error: "rpc_failed", details: rpcErr.message },
          { status: 500 }
        );
      }
      await supabaseAuth
        .from("new_students")
        .update({
          gender,
          parent_name: parentName,
          phone,
          campus,
          english_first_name: englishFirstName,
          passport_english_name: passportEnglishName,
          child_birth_date: childBirthDate,
        })
        .eq("id", draft.id);
    } else {
      const now = new Date().toISOString();
      const { error: insertErr } = await supabaseAuth
        .from("new_students")
        .insert({
          parent_id: parentId,
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
        });
      if (insertErr) {
        return NextResponse.json(
          { ok: false, error: "new_students_insert_failed" },
          { status: 500 }
        );
      }
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
