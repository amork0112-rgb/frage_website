import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = Number(params.id);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
    }

    const supabaseAuth = createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    // 1. Fetch all reactions for this notice
    const { data: reactions, error } = await supabaseService
      .from("notice_reactions")
      .select("reaction_type, user_id")
      .eq("notice_id", postId);

    if (error) {
      console.error("Reactions fetch error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 2. Calculate counts
    const counts = {
      check: 0,
      heart: 0,
      smile: 0,
    };

    const myReactions: string[] = [];

    if (reactions) {
      reactions.forEach((r) => {
        if (r.reaction_type in counts) {
          counts[r.reaction_type as keyof typeof counts]++;
        }
        
        // If this reaction belongs to current user, add to myReactions
        if (user && r.user_id === user.id) {
          myReactions.push(r.reaction_type);
        }
      });
    }

    return NextResponse.json({
      ok: true,
      counts,
      myReactions,
    });
  } catch (e) {
    console.error("Reactions GET exception:", e);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
