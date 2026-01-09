import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServer();

    // 1️⃣ 로그인 유저 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 2️⃣ 권한 체크 (JWT 기반)
    const role = user.app_metadata?.role;
    if (role !== "admin" && role !== "master_admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 3️⃣ teachers 조회 (RLS 적용)
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
