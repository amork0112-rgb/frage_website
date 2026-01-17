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

    // 2. Call RPC to toggle reaction
    const { data, error } = await supabase.rpc("toggle_notice_reaction", {
      p_post_id: postId,
      p_user_id: user.id,
      p_reaction_type: reactionType
    });

    if (error) {
      console.error("Reaction toggle error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Assuming RPC returns some info, but we just return ok: true and maybe the action result if available
    return NextResponse.json({ ok: true, result: data });
  } catch (e) {
    console.error("Reaction toggle exception:", e);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
