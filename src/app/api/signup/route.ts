import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const supabase = supabaseServer;

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

    /* -------------------------
       2️⃣ 현재 로그인 사용자 확인
    -------------------------- */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(
      request.headers.get("Authorization")?.replace("Bearer ", "")
    );

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

    const { data: existingParent } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();

    if (existingParent) {
      parentId = existingParent.id;
    } else {
      const { data: newParent, error: parentError } = await supabase
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
    const { data: draftRow } = await supabase
      .from("new_students")
      .select("id,status")
      .eq("parent_id", parentId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1);
    const draft = Array.isArray(draftRow) && draftRow.length > 0 ? draftRow[0] : null;
    if (!draft?.id) {
      return NextResponse.json(
        { ok: false, error: "no_draft_found" },
        { status: 400 }
      );
    }
    const { error: rpcErr } = await supabase.rpc("draft_to_waiting", {
      new_student_id: draft.id,
      student_name: studentName,
    });
    if (rpcErr) {
      return NextResponse.json(
        { ok: false, error: "rpc_failed", details: rpcErr.message },
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
