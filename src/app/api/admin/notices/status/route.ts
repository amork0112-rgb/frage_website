// src/app/api/admin/notices/status/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;
    const body = await req.json();
    const id = String(body?.id || "");
    const status = String(body?.status || "");
    if (!id || !status) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const map =
      status === "pinned"
        ? { is_pinned: true, is_archived: false }
        : status === "archived"
        ? { is_pinned: false, is_archived: true }
        : { is_pinned: false, is_archived: false };
    const numId = Number(id);
    if (!Number.isNaN(numId)) {
      const { error } = await supabaseAuth.from("posts").update(map).eq("id", numId);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      const { data: promo } = await supabaseAuth
        .from("notice_promotions")
        .select("id,pinned,archived")
        .eq("post_id", numId)
        .maybeSingle();
      if (promo) {
        const promoMap =
          status === "pinned"
            ? { pinned: true, archived: false }
            : status === "archived"
            ? { pinned: false, archived: true }
            : { pinned: false, archived: false };
        const { error: promoErr } = await supabaseAuth
          .from("notice_promotions")
          .update(promoMap)
          .eq("post_id", numId);
        if (promoErr) {
          return NextResponse.json({ ok: false, error: promoErr.message }, { status: 500 });
        }
      }
    }
    return NextResponse.json({ ok: true, id, status }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}
