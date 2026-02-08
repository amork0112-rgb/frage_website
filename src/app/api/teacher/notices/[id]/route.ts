// app/api/teacher/notices/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const supabaseAuth = createSupabaseServer();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Teacher Check (DB Source of Truth)
  const { data: teacher } = await supabaseService
    .from("teachers")
    .select("id, role, campus")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!teacher) {
    return NextResponse.json({ error: "Forbidden: Teacher only" }, { status: 403 });
  }

  // Verify ownership
  const { data: post } = await supabaseService
    .from("posts")
    .select("creator_id")
    .eq("id", id)
    .single();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.creator_id !== user.id) {
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
  
  const supabaseAuth = createSupabaseServer();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Teacher Check (DB Source of Truth)
  const { data: teacher } = await supabaseService
    .from("teachers")
    .select("id, role, campus")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!teacher) {
    return NextResponse.json({ error: "Forbidden: Teacher only" }, { status: 403 });
  }

  // Verify ownership
  const { data: post } = await supabaseService
    .from("posts")
    .select("creator_id")
    .eq("id", id)
    .single();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: You can only delete your own notices" }, { status: 403 });
  }

  const { error } = await supabaseService
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
