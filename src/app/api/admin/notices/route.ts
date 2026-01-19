import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Auth & Role Check
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseService
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
  }

  // 2. Query
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  // Filter mainly for academic/admin notices, but admins can view all if needed.
  // The requirement says "Admin manages academic/administrative notices".
  // So we default to filtering notice_type='academic', but allow viewing all?
  // Let's stick to showing all notices created by admins or explicitly 'academic'.
  
  const query = supabaseService
    .from("posts")
    .select("*", { count: "exact" })
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

  // 1. Auth Check
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseService
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    const { data, error } = await supabaseService
      .from("posts")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
