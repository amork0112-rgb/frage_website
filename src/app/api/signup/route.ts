import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentName,
      gender,
      parentName,
      phone,
      address,
      addressDetail,
      passportEnglishName,
      englishFirstName,
      childBirthDate,
    } = body || {};

    if (
      !studentName ||
      (gender !== "M" && gender !== "F") ||
      !parentName ||
      !phone ||
      !passportEnglishName ||
      !englishFirstName ||
      !childBirthDate
    ) {
      return NextResponse.json({ ok: false, error: "필수 항목 누락" }, { status: 400 });
    }

    const passOk = /^[A-Z][A-Z\s-]{0,49}$/.test(String(passportEnglishName));
    const firstOk = /^[A-Za-z][A-Za-z\s-]{0,29}$/.test(String(englishFirstName));
    const dob = new Date(String(childBirthDate));
    const today = new Date();
    const pastOk = dob < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (!passOk || !firstOk || Number.isNaN(dob.getTime()) || !pastOk) {
      return NextResponse.json({ ok: false, error: "유효성 검사 실패" }, { status: 400 });
    }

    // TODO: Supabase/Firebase 연동 시 여기에 DB 저장 로직 추가
    // 현재 MVP에서는 수신 및 검증만 수행

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "요청 처리 중 오류" }, { status: 500 });
  }
}
