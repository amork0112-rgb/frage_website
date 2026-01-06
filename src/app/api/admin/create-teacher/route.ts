import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Campus = "International" | "Andover" | "Platz" | "Atheneum";
type Role = "teacher" | "campus";

export async function POST(request: Request) {
  try {
    // 1️⃣ 현재 로그인 유저 (서버 기준)
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // 2️⃣ admin 체크 (JWT 기준)
    if (user.app_metadata?.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 3️⃣ payload
    const body = await request.json();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const campus = String(body?.campus ?? "International") as Campus;
    const role = String(body?.role ?? "teacher") as Role;

    if (!email || !password || !name) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    // 4️⃣ auth.users 생성 (service role)
    const { data: created, error: authError } =
      await supabaseServer.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role },
        user_metadata: { name, campus },
      });

    if (authError || !created?.user?.id) {
      return NextResponse.json(
        { ok: false, error: authError?.message || "create_user_failed" },
        { status: 400 }
      );
    }

    const teacherId = created.user.id;

    // 5️⃣ teachers 테이블 insert (스키마 맞춤)
    const { error: insertError } = await supabaseServer.from("teachers").insert({
      id: teacherId,
      name,
      campus,
      role,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: teacherId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
