import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const authRole = user.app_metadata?.role ?? "parent";
    if (authRole !== "admin" && authRole !== "master_admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 3️⃣ payload
    const body = await req.json();
    const { email, password, name, campus, role = "teacher" } = body;

    // 4️⃣ 계정 생성 (service role)
    const { data: created, error } =
      await supabaseService.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role },
        user_metadata: { name, campus },
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 5️⃣ teachers 테이블
    await supabaseService.from("teachers").insert({
      id: created.user.id,
      name,
      campus,
      role,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
