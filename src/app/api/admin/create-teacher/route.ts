import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // 1️⃣ 로그인 유저 확인 (anon + cookie)
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 2️⃣ admin 체크
    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 3️⃣ payload
    const body = await req.json();
    const { email, password, name, campus = "International", role = "teacher" } = body;

    // 4️⃣ 계정 생성 (service role)
    const { data: created, error } =
      await supabaseServer.auth.admin.createUser({
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
    await supabaseServer.from("teachers").insert({
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
