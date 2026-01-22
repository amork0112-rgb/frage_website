export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "100"); // Fetch all/many by default for client-side pagination or set reasonable limit

    // 1. Fetch promotions (without join)
    const { data: promotions, error } = await supabaseService
      .from("notice_promotions")
      .select(`
        id,
        title,
        pinned,
        push_enabled,
        created_at,
        post_id
      `)
      .eq("archived", false)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching news:", error);
      return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
    }

    // 2. Fetch related posts
    const postIds = promotions.map((p) => p.post_id).filter((id) => id !== null) as number[];
    
    let posts: any[] = [];
    if (postIds.length > 0) {
      const { data: postsData, error: postsError } = await supabaseService
        .from("posts")
        .select("id, title, content, created_at, image_url")
        .in("id", postIds);
        
      if (postsError) {
         console.error("Error fetching posts:", postsError);
      } else {
         posts = postsData || [];
      }
    }

    // 3. Merge
    const postMap = Object.fromEntries(posts.map((p) => [p.id, p]));

    const data = promotions.map((p) => ({
      ...p,
      posts: postMap[p.post_id] ?? null,
    }));

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
