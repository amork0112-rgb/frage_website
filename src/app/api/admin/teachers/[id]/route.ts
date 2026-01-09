import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;
    const id = String(ctx?.params?.id || "");
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    const { error: e1 } = await supabaseService
      .from("teacher_classes")
      .delete()
      .eq("teacher_id", id);
    if (e1) return NextResponse.json({ ok: false }, { status: 500 });
    const { error: e2 } = await supabaseService
      .from("teachers")
      .delete()
      .eq("id", id);
    if (e2) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
