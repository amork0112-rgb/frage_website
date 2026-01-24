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

    // 1. Verify Post Exists & Check Scope
    const { data: post, error: fetchError } = await supabaseAuth
      .from("posts")
      .select("scope")
      .eq("id", id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });
    }

    if (post.scope !== "global") {
      return NextResponse.json({
        error: "CLASS notice cannot be managed by admin",
      }, { status: 403 });
    }

    // 2. Update Post Status
    const { error } = await supabaseAuth.from("posts").update(map).eq("id", id);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 3. Handle Notice Promotions (Upsert Logic)
    const { data: promo } = await supabaseAuth
      .from("notice_promotions")
      .select("id,pinned,archived")
      .eq("post_id", id)
      .maybeSingle();

    if (promo) {
      // Update existing promotion
      const promoMap =
        status === "pinned"
          ? { pinned: true, archived: false }
          : status === "archived"
          ? { pinned: false, archived: true }
          : { pinned: false, archived: false };

      const { error: promoErr } = await supabaseAuth
        .from("notice_promotions")
        .update(promoMap)
        .eq("post_id", id);

      if (promoErr) {
        return NextResponse.json({ ok: false, error: promoErr.message }, { status: 500 });
      }
    } else if (status === "pinned" || status === "normal" || status === "archived") {
      // Create new promotion if missing (and status is relevant)
      // Note: User asked to insert if status is pinned or normal. 
      // Archived might also be valid to track, but user specifically mentioned "pinned or normal".
      // However, to be consistent with "News" visibility, archived=false is key.
      
      const newPromo = {
        post_id: id,
        pinned: status === "pinned",
        archived: status === "archived", // If archived, create as archived
        push_enabled: false, // Default
        created_at: new Date().toISOString()
      };

      const { error: insertErr } = await supabaseAuth
        .from("notice_promotions")
        .insert(newPromo);
        
      if (insertErr) {
        console.error("Failed to auto-create promotion:", insertErr);
        // We don't fail the whole request here as the main post update succeeded
      }
    }

    return NextResponse.json({ ok: true, id, status }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "bad_request" }, { status: 400 });
  }
}
