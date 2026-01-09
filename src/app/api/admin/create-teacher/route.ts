import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    /* -------------------------------------------------------
      1️⃣ Admin 인증 (SSR + role 체크)
    ------------------------------------------------------- */
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;

    /* -------------------------------------------------------
      2️⃣ Payload 파싱
    ------------------------------------------------------- */
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "");
    const campus = String(body.campus || "");
    const role = String(body.role || "teacher");

    if (!email || !name || !campus) {
      return NextResponse.json(
        { error: "invalid_payload" },
        { status: 400 }
      );
    }

    /* -------------------------------------------------------
      3️⃣ auth.users 에 이미 계정이 있는지 확인
    ------------------------------------------------------- */
    const { data: listData, error: listErr } =
      await supabaseService.auth.admin.listUsers({
        email,
      });

    if (listErr) {
      console.error("LIST USER ERROR:", listErr);
      return NextResponse.json(
        { error: "list_user_failed" },
        { status: 500 }
      );
    }

    const existingUser = listData?.users?.[0];

    let userId: string;

    /* -------------------------------------------------------
      4️⃣ Case A: 이미 auth 계정이 존재하는 경우
    ------------------------------------------------------- */
    if (existingUser) {
      userId = existingUser.id;
    }

    /* -------------------------------------------------------
      5️⃣ Case B: auth 계정이 없는 경우 → 새로 생성
    ------------------------------------------------------- */
    else {
      if (!password) {
        return NextResponse.json(
          { error: "password_required_for_new_user" },
          { status: 400 }
        );
      }

      const { data: created, error: createErr } =
        await supabaseService.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { role: "teacher" }, // auth 권한은 단순화
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

    /* -------------------------------------------------------
      6️⃣ teachers 테이블에 이미 연결돼 있는지 확인
    ------------------------------------------------------- */
    const { data: existingTeacher } = await supabaseService
      .from("teachers")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingTeacher) {
      return NextResponse.json(
        { error: "teacher_already_exists" },
        { status: 200 }
      );
    }

    /* -------------------------------------------------------
      7️⃣ teachers 테이블에 프로필 생성
    ------------------------------------------------------- */
    const now = new Date().toISOString();

    const { error: insertErr } = await supabaseService
      .from("teachers")
      .insert({
        id: userId,           // auth.users.id (FK)
        name,
        campus,
        role,                 // teacher / campus_manager 등
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

    /* -------------------------------------------------------
      8️⃣ 성공
    ------------------------------------------------------- */
    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error("CREATE TEACHER FATAL ERROR:", e);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}
