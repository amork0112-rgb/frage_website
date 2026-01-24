//api/admin/notices/rout.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET(request: Request) {
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Auth & Role Check (Standardized)
  const supabase = createSupabaseServer();
  const guard = await requireAdmin(supabase);
  if ("error" in guard) return guard.error;
  
  // 2. Query
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabaseService
      .from("posts")
      .select(`
        *,
        notice_promotions (
          id,
          pinned,
          archived,
          push_enabled
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  }

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  // Filter mainly for academic/admin notices
  const query = supabaseService
    .from("posts")
    .select(`
      *,
      notice_promotions (
        id,
        pinned,
        archived,
        push_enabled
      )
    `, { count: "exact" })
    .eq("category", "notice")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Optional: filter by notice_type if provided
  const typeFilter = searchParams.get("type");
  if (typeFilter) {
    query.eq("notice_type", typeFilter);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, meta: { page, limit, total: count } });
}

export async function POST(request: Request) {
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Auth Check (Standardized)
  const supabase = createSupabaseServer();
  const guard = await requireAdmin(supabase);
  if ("error" in guard) return guard.error;
  const user = guard.user;

  // 2. Validation & Insert
  try {
    const body = await request.json();
    
    // Admin Constraints:
    // - notice_type: 'academic'
    // - scope: 'global' or 'campus' (NOT 'class')
    
    const payload = {
      title: body.title,
      content: body.content,
      category: "notice", // Fixed
      notice_type: "academic", // Fixed for Admin
      scope: body.scope || "global",
      campus: body.scope === "campus" ? body.campus : null,
      class_id: null, // Admin cannot set class_id
      creator_role: "admin",
      author_id: user.id, // Replaces creator_id
      is_pinned: body.is_pinned || false,
      is_archived: false,
    };

    if (payload.scope === "class") {
      return NextResponse.json({ error: "Admins cannot create class-scoped notices" }, { status: 400 });
    }

    const { data: post, error } = await supabaseService
      .from("posts")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // 3. Insert into notice_promotions if publishAsNews is true
    if (body.publishAsNews) {
      const { error: promoError } = await supabaseService
        .from("notice_promotions")
        .insert({
          post_id: post.id,
          pinned: body.is_pinned ?? false,
          archived: false,
          push_enabled: body.push_enabled ?? false,
          created_at: new Date().toISOString(),
        });

      // Rollback if promotion creation fails
      if (promoError) {
        console.error("Failed to create notice_promotion:", promoError);
        await supabaseService.from("posts").delete().eq("id", post.id);
        throw new Error("Failed to create news promotion");
      }
    }

    return NextResponse.json({ data: post });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Auth Check (Standardized)
  const supabase = createSupabaseServer();
  const guard = await requireAdmin(supabase);
  if ("error" in guard) return guard.error;

  // 2. Delete
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const { error } = await supabaseService
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Auth Check (Standardized)
  const supabase = createSupabaseServer();
  const guard = await requireAdmin(supabase);
  if ("error" in guard) return guard.error;

  // 2. Validation & Update
  try {
    const body = await request.json();
    
    // Check required fields
    if (!body.id || !body.update_mode) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // We assume the POSTS table update is already done by client or can be done here.
    // The prompt says: "notice_promotions는 오직 서버 API에서만 접근"
    // Client-side updated POSTS, now we handle notice_promotions here.
    
    const postId = body.id;
    const publishAsNews = body.publishAsNews;

    if (publishAsNews) {
      // Upsert promotion
      const { data: existing } = await supabaseService
        .from("notice_promotions")
        .select("id")
        .eq("post_id", postId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabaseService
          .from("notice_promotions")
          .update({
            // title: body.title, // Title is not in notice_promotions schema based on previous code usage
            // Wait, previous code in client had: title: (newsTitle || title).trim()
            // But user prompt for POST logic:
            // insert({ post_id: post.id, pinned: false, archived: false, push_enabled: ... })
            // It seems 'title' column might not exist or user simplified it.
            // Let's check schema or previous usage. 
            // In /app/admin/notices/new/page.tsx: .insert({ post_id, title, ... })
            // So 'title' column exists in notice_promotions?
            // The user prompt example for POST didn't include title.
            // "insert 데이터: { post_id, pinned, archived, push_enabled, created_at }"
            // I will stick to user prompt fields. If title is needed, user would have added it.
            // But wait, client code was inserting title.
            // "프롬프트: /api/admin/notices/route.ts 의 POST 로직을 수정해줘... insert 데이터: { ... }"
            // User explicitly defined the fields. I should follow that.
            // So I will NOT include title in notice_promotions update/insert.
            
            pinned: body.is_pinned_news ?? false,
            push_enabled: body.push_enabled ?? false,
            archived: false,
          })
          .eq("post_id", postId);
          
        if (error) throw error;
      } else {
        const { error } = await supabaseService
          .from("notice_promotions")
          .insert({
            post_id: postId,
            pinned: body.is_pinned_news ?? false,
            archived: false,
            push_enabled: body.push_enabled ?? false,
            created_at: new Date().toISOString(),
          });
          
        if (error) throw error;
      }
    } else {
      // Delete promotion if exists
      const { error } = await supabaseService
        .from("notice_promotions")
        .delete()
        .eq("post_id", postId);
        
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
