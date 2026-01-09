import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;
    const id = String(ctx?.params?.id || "");
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    const { data: rows } = await supabaseService
      .from("teachers")
      .select("active")
      .eq("id", id)
      .limit(1);
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const nextActive = row ? !Boolean(row.active ?? true) : true;
    const { error } = await supabaseService
      .from("teachers")
      .update({ active: nextActive, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true, id, active: nextActive }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
