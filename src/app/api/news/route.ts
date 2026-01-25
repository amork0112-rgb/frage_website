// app/api/news/route.ts
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  try {
    // 1️⃣ promotions + posts JOIN
    const { data: promotions, error } = await supabaseService
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
      .eq("archived", false)
      .eq("posts.published", true)
      .eq("posts.is_archived", false)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    // 🔹 (A) Joined Data Raw
    console.log("🟢 promotions joined raw:", promotions?.map((p: any) => ({ 
      post_id: p.post_id, 
      pinned: p.pinned, 
      hasPost: !!p.posts,
      postTitle: p.posts?.title,
      postPublished: p.posts?.published
    })));

    if (error) {
      console.error("promotions error:", error);
      return NextResponse.json({ ok: true, data: [] });
    }

    if (!promotions || promotions.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    // 2️⃣ Format Data
    // The JOIN returns posts as an object (or array depending on relationship inference, but usually object for FK).
    // We filter just in case !inner didn't catch something (though it should).
    const data = promotions
      .filter((p: any) => p.posts) // Safety check
      .map((p: any) => ({
        ...p,
        // Ensure posts is structurally consistent with what frontend expects
        // Previous implementation returned posts: postMap[id], so it was an object.
        // Supabase returns it as object or array. We assume object here due to singular FK.
        // If it returns array, we take first.
        posts: Array.isArray(p.posts) ? p.posts[0] : p.posts
      }));

    // 🔹 (E) final data
    console.log("🔴 final data:", data.map((d: any) => ({ 
      post_id: d.post_id, 
      postTitle: d.posts?.title
    })));

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ ok: true, data: [] });
  }
}
