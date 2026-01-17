import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAuth = createSupabaseServer();

    // 1. Check Authentication (portal 세션 기반)
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const postId = Number(params.id);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const { reactionType } = body;
    
    if (!['check', 'heart', 'smile'].includes(reactionType)) {
      return NextResponse.json({ ok: false, error: "Invalid reaction type" }, { status: 400 });
    }

    // 2. Toggle reaction manually in notice_reactions table (service role 사용)
    const { data: existing, error: existingError } = await supabaseService
      .from("notice_reactions")
      .select("id")
      .eq("notice_id", postId)
      .eq("user_id", user.id)
      .eq("reaction_type", reactionType)
      .maybeSingle();

    if (existingError) {
      console.error("Reaction fetch error:", existingError);
      return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
    }

    if (existing && existing.id) {
      const { error: deleteError } = await supabaseService
        .from("notice_reactions")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        console.error("Reaction delete error:", deleteError);
        return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, result: { toggled: "off" } });
    }

    const { error: insertError } = await supabaseService.from("notice_reactions").insert({
      notice_id: postId,
      user_id: user.id,
      reaction_type: reactionType,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Reaction insert error:", insertError);
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result: { toggled: "on" } });
  } catch (e) {
    console.error("Reaction toggle exception:", e);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
