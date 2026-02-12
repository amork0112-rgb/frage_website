import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = parseInt(params.id);

    if (isNaN(postId)) {
      return NextResponse.json({ ok: false, error: "Invalid post ID" }, { status: 400 });
    }

    const { data: promotion, error } = await supabaseService
      .from("notice_promotions")
      .select(`
        post_id,
        pinned,
        push_enabled,
        created_at,
        posts!inner (
          id,
          title,
          content,
          image_url,
          created_at,
          published,
          is_archived
        )
      `)
      .eq("post_id", postId)
      .eq("archived", false)
      .single();

    if (error) {
      console.error("Error fetching news detail:", error);
      return NextResponse.json({ ok: false, error: "News not found" }, { status: 404 });
    }

    if (!promotion) {
      return NextResponse.json({ ok: false, error: "News not found" }, { status: 404 });
    }

    // Supabase returns posts as an object or array. Ensure it's an object.
    const formattedPromotion = {
      ...promotion,
      posts: Array.isArray(promotion.posts) ? promotion.posts[0] : promotion.posts
    };

    return NextResponse.json({ ok: true, data: formattedPromotion });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
