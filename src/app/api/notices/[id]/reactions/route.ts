import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAuth = createSupabaseServer();
    const postId = Number(params.id);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
    }

    // 1. Get counts from materialized view v_notice_reaction_counts
    const { data: countsRows, error: countsError } = await supabaseService
      .from("v_notice_reaction_counts")
      .select("notice_id,check_count,heart_count,smile_count")
      .eq("notice_id", postId)
      .maybeSingle();

    let counts = {
      check: 0,
      heart: 0,
      smile: 0,
    };

    if (countsError) {
      console.error("Fetch counts error:", countsError);
    } else if (countsRows) {
      counts = {
        check: Number((countsRows as any).check_count ?? 0),
        heart: Number((countsRows as any).heart_count ?? 0),
        smile: Number((countsRows as any).smile_count ?? 0),
      };
    }

    // 2. Get user's reactions if logged in
    let myReactions: string[] = [];
    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (user) {
      const { data: userReactionsData, error: userError } = await supabaseService
        .from("notice_reactions")
        .select("reaction_type")
        .eq("notice_id", postId)
        .eq("user_id", user.id);
        
      if (!userError && userReactionsData) {
        myReactions = userReactionsData.map((r: any) => r.reaction_type);
      }
    }

    return NextResponse.json({ ok: true, counts, myReactions });

  } catch (e) {
    console.error("Fetch reactions exception:", e);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
