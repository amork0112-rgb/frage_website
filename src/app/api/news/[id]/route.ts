export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }

    // 1. Fetch promotion (without join)
    const { data: promotion, error } = await supabaseService
      .from("notice_promotions")
      .select(`
        title,
        pinned,
        push_enabled,
        created_at,
        post_id
      `)
      .eq("post_id", id)
      .eq("archived", false)
      .single();

    if (error || !promotion) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // 2. Fetch related post
    let post = null;
    if (promotion.post_id) {
      const { data: postData } = await supabaseService
        .from("posts")
        .select("id, title, content, created_at, image_url")
        .eq("id", promotion.post_id)
        .eq("published", true)
        .eq("is_archived", false)
        .single();
      
      post = postData;
    }

    if (!post) {
       return NextResponse.json({ ok: false, error: "post_not_found_or_hidden" }, { status: 404 });
    }

    // 3. Merge
    const data = {
      ...promotion,
      posts: post,
    };

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
