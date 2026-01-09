import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;
    const body = await req.json();
    const email = String(body.email || "");
    const name = String(body.name || "");
    const campus = String(body.campus || "");
    const role = String(body.role || "teacher");
    const authUserId = String(body.authUserId || "");
    if (!authUserId || !name || !campus) {
      return NextResponse.json({ error: "missing_auth_user_id" }, { status: 400 });
    }
    const payload: any = { id: authUserId, name, campus, role };
    if (email) payload.email = email;
    const { error } = await supabaseAuth.from("teachers").insert(payload);
    if (error) {
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
