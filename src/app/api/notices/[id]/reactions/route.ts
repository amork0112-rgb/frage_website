import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    const postId = Number(params.id);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
    }

    // 1. Get counts from view
    const { data: countsData, error: countsError } = await supabase
      .from("notice_reactions_count_view")
      .select("reaction_type, count")
      .eq("notice_id", postId);

    if (countsError) {
      console.error("Fetch counts error:", countsError);
      // Fallback to zeros if view missing or error
      return NextResponse.json({ 
        ok: true, 
        counts: { check: 0, heart: 0, smile: 0 }, 
        myReactions: [] 
      });
    }

    const counts = {
      check: 0,
      heart: 0,
      smile: 0
    };

    if (Array.isArray(countsData)) {
      countsData.forEach((row: any) => {
        if (row.reaction_type === 'check') counts.check = Number(row.count);
        if (row.reaction_type === 'heart') counts.heart = Number(row.count);
        if (row.reaction_type === 'smile') counts.smile = Number(row.count);
      });
    }

    // 2. Get user's reactions if logged in
    let myReactions: string[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userReactionsData, error: userError } = await supabase
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
