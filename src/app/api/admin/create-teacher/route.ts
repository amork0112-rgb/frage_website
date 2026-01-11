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

    const ALLOWED_CAMPUSES = ["International", "Atheneum", "Andover"];
    if (!ALLOWED_CAMPUSES.includes(campus)) {
      return NextResponse.json(
        { error: "invalid_campus" },
        { status: 400 }
      );
    }

    /* -------------------------------------------------
      3️⃣ auth.users 동일 이메일 존재 여부 확인 (권장 방식)
    ------------------------------------------------- */
    // Robust email lookup with paging to avoid perPage cap issues
    let existingUser: any = null;
    {
      let page = 1;
      const perPage = 200;
      // loop up to 20 pages (max 4000 users)
      while (page <= 20 && !existingUser) {
        const { data: pageData, error: pageErr } = await supabaseService.auth.admin.listUsers({ page, perPage });
        if (pageErr) break;
        const users = Array.isArray(pageData?.users) ? pageData.users : [];
        existingUser = users.find((u: any) => String(u.email || "").toLowerCase() === email.toLowerCase()) || null;
        if (!users.length) break;
        page += 1;
      }
    }

    let userId: string;
    let createdNewUser = false;

    /* -------------------------------------------------
      4️⃣ auth 계정 생성 또는 재사용
    ------------------------------------------------- */
    if (existingUser?.id) {
      userId = existingUser.id;
      await supabaseService.auth.admin.updateUserById(userId, {
        app_metadata: { role },
        user_metadata: { name, campus },
      });
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
      createdNewUser = true;
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
      if (createdNewUser) {
        try {
          await supabaseService.auth.admin.deleteUser(userId);
        } catch {}
      }
      return NextResponse.json(
        { error: "insert_teacher_failed" },
        { status: 500 }
      );
    }

    try {
      const adminId = (guard as any).user?.id ?? null;
      if (adminId) {
        await supabaseService
          .from("admin_logs")
          .insert({
            admin_id: adminId,
            action: "create_teacher",
            target_user_id: userId,
            created_at: now,
          });
      }
    } catch {}

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
