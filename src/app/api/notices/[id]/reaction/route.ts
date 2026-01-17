import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    
    // 1. Check Authentication
    const { data: { user } } = await supabase.auth.getUser();
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

    // 2. Toggle reaction manually in notice_reactions table
    const { data: existing, error: existingError } = await supabase
      .from("notice_reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .eq("reaction_type", reactionType)
      .maybeSingle();

    if (existingError) {
      console.error("Reaction fetch error:", existingError);
      return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
    }

    if (existing && existing.id) {
      const { error: deleteError } = await supabase
        .from("notice_reactions")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        console.error("Reaction delete error:", deleteError);
        return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, result: { toggled: "off" } });
    }

    const { error: insertError } = await supabase.from("notice_reactions").insert({
      post_id: postId,
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
