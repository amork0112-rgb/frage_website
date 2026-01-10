//app/api/admission/home/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServer();

    /* 1️⃣ 인증 확인 */
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role !== "parent") {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    /* 2️⃣ 부모 정보 조회 */
    const { data: parent, error: parentErr } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (parentErr || !parent) {
      // 부모 레코드가 아직 없으면 빈 리스트 반환
      return NextResponse.json(
        { ok: true, items: [] },
        { status: 200 }
      );
    }

    /* 3️⃣ 신규 학생(new_students) 조회 */
    const { data: rows, error: studentErr } = await supabase
      .from("new_students")
      .select(`
        id,
        status,
        student_name,
        english_first_name,
        passport_english_name,
        child_birth_date,
        parent_name,
        phone,
        campus,
        address,
        created_at
      `)
      .eq("parent_id", parent.id)
      .order("created_at", { ascending: false });

    if (studentErr) {
      return NextResponse.json(
        { ok: false, error: "fetch_failed" },
        { status: 500 }
      );
    }

    /* 4️⃣ 프론트에서 바로 쓰기 좋은 형태로 정리 */
    const items = Array.isArray(rows)
      ? rows.map((r: any) => ({
          id: String(r.id),
          status: String(r.status || "waiting"),

          student_name: String(r.student_name || ""),
          english_first_name: String(r.english_first_name || ""),
          passport_english_name: String(r.passport_english_name || ""),
          child_birth_date: r.child_birth_date
            ? String(r.child_birth_date)
            : "",

          parent_name: String(r.parent_name || ""),
          phone: String(r.phone || ""),
          campus: String(r.campus || ""),
          address: String(r.address || ""),

          created_at: r.created_at ? String(r.created_at) : "",
        }))
      : [];

    return NextResponse.json(
      { ok: true, items },
      { status: 200 }
    );
  } catch (e) {
    console.error("[admission/home] error", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
