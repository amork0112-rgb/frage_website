import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;
    const body = await req.json();
    const email = String(body.email || "");
    const password = String(body.password || "");
    const name = String(body.name || "");
    const campus = String(body.campus || "");
    const role = String(body.role || "teacher");
    if (!email || !password || !name || !campus) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const { data: created, error: createErr } = await supabaseService.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { name, campus },
    });
    if (createErr || !created?.user?.id) {
      return NextResponse.json({ error: createErr?.message || "create_failed" }, { status: 500 });
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
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
