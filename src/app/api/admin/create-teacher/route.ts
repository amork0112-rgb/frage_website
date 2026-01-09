import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    /* -------------------------------------------------
      1️⃣ Admin 인증 (SSR + JWT)
    ------------------------------------------------- */
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;

    /* -------------------------------------------------
      2️⃣ Payload
    ------------------------------------------------- */
    const body = await req.json();

    const email = String(body.email || "").trim();
    const password = String(body.password || "").trim();
    const name = String(body.name || "").trim();
    const campus = String(body.campus || "").trim();
    const role = String(body.role || "teacher").trim();

    if (!email || !password || !name || !campus) {
      return NextResponse.json(
        { error: "invalid_payload" },
        { status: 400 }
      );
    }

    /* -------------------------------------------------
      3️⃣ auth.users 에 동일 이메일 존재 여부 확인
      (Supabase는 email 필터 API가 없으므로 전체 조회 후 JS 필터)
    ------------------------------------------------- */
    const { data: listData, error: listErr } =
      await supabaseService.auth.admin.listUsers({
        perPage: 1000,
      });

    if (listErr) {
      console.error("LIST USER ERROR:", listErr);
      return NextResponse.json(
        { error: "list_user_failed" },
        { status: 500 }
      );
    }

    const existingUser = listData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    /* -------------------------------------------------
      4️⃣ auth 계정 생성 또는 재사용
    ------------------------------------------------- */
    if (existingUser) {
      // 이미 auth.users 에 계정이 존재
      userId = existingUser.id;
    } else {
      const { data: created, error: createErr } =
        await supabaseService.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { role },
          user_metadata: { name, campus },
        });

      if (createErr || !created?.user?.id) {
        console.error("CREATE USER ERROR:", createErr);
        return NextResponse.json(
          { error: createErr?.message || "create_user_failed" },
          { status: 500 }
        );
      }

      userId = created.user.id;
    }

    /* -------------------------------------------------
      5️⃣ teachers 테이블에 이미 연결되어 있는지 확인
    ------------------------------------------------- */
    const { data: existingTeacher } = await supabaseService
      .from("teachers")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingTeacher) {
      return NextResponse.json(
        { error: "teacher_already_exists" },
        { status: 409 }
      );
    }

    /* -------------------------------------------------
      6️⃣ teachers 테이블에 프로필 생성
    ------------------------------------------------- */
    const now = new Date().toISOString();

    const { error: insertErr } = await supabaseService
      .from("teachers")
      .insert({
        id: userId,          // auth.users.id 와 동일
        name,
        campus,
        role,
        active: true,
        created_at: now,
        updated_at: now,
      });

    if (insertErr) {
      console.error("INSERT TEACHER ERROR:", insertErr);
      return NextResponse.json(
        { error: "insert_teacher_failed" },
        { status: 500 }
      );
    }

    /* -------------------------------------------------
      7️⃣ 성공
    ------------------------------------------------- */
    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error("CREATE TEACHER SERVER ERROR:", e);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}
