import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();

    const guard = await requireAdmin(supabaseAuth);
    if ("error" in guard) return guard.error;

    const { user } = guard;

    const body = await req.json();
    console.log("RAW BODY:", body);

    const email = String(body.email || "");
    const password = String(body.password || "");
    const name = String(body.name || "");
    const campus = String(body.campus || "");

    // ⚠️ auth role은 teacher로 고정
    const role = "teacher";

    if (!email || !password || !name || !campus) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    console.log("SERVICE ROLE:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("ADMIN USER:", user.email, user.app_metadata?.role);

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
        { error: createErr?.message || "create_failed" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    const { error: insertErr } = await supabaseService
      .from("teachers")
      .insert({
        id: created.user.id,
        name,
        campus,
        role,
        active: true,
        created_at: now,
        updated_at: now,
      });

    if (insertErr) {
      console.error("TEACHERS INSERT ERROR:", insertErr);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error("CREATE TEACHER FATAL ERROR:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
