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
        id,
        title,
        pinned,
        push_enabled,
        created_at,
        post_id
      `)
      .eq("id", id)
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
        .single();
      
      post = postData;
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
