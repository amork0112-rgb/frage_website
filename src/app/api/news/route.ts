export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  try {
    // 1️⃣ promotions 먼저 가져오기
    const { data: promotions, error } = await supabaseService
      .from("notice_promotions")
      .select(`
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
      console.error("promotions error:", error);
      // ❗ public 페이지는 빈 배열이라도 반환
      return NextResponse.json({ ok: true, data: [] });
    }

    if (!promotions || promotions.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    // 2️⃣ posts 가져오기
    const postIds = promotions
      .map(p => p.post_id)
      .filter(Boolean);

    const { data: posts, error: postError } = await supabaseService
      .from("posts")
      .select("id, title, content, created_at, image_url")
      .in("id", postIds)
      .eq("published", true)
      .eq("is_archived", false);

    if (postError) {
      console.error("posts error:", postError);
      return NextResponse.json({ ok: true, data: [] });
    }

    // 3️⃣ merge
    const postMap = Object.fromEntries(
      (posts ?? []).map(p => [p.id, p])
    );

    const data = promotions
      .map(p => ({
        ...p,
        posts: postMap[p.post_id] ?? null, // frontend compatibility: 'posts' instead of 'post'
      }))
      .filter(p => p.posts !== null);

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ ok: true, data: [] });
  }
}
