import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: post } = await supabaseService
    .from("posts")
    .select("author_id")
    .eq("id", id)
    .single();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: You can only edit your own notices" }, { status: 403 });
  }

  try {
    const body = await request.json();
    // Teacher can update title, content, is_pinned.
    // Prevent changing scope or class_id freely? 
    // For simplicity, allow update but ownership check is key.
    
    const { data, error } = await supabaseService
      .from("posts")
      .update({
        title: body.title,
        content: body.content,
        is_pinned: body.is_pinned,
        // Don't allow changing scope/class_id via this endpoint for safety, or add checks.
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: post } = await supabaseService
    .from("posts")
    .select("author_id")
    .eq("id", id)
    .single();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: You can only delete your own notices" }, { status: 403 });
  }

  const { error } = await supabaseService
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
