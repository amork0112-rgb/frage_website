import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Auth Check (Teacher)
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);

  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify Teacher Role
  // Assuming 'teachers' table exists and links to auth.users via id
  const { data: teacher } = await supabaseService
    .from("teachers") // or profiles with role='teacher'
    .select("id")
    .eq("id", user.id)
    .single();

  if (!teacher) return NextResponse.json({ error: "Forbidden: Teacher only" }, { status: 403 });

  // 2. Query Params
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");

  if (!classId) {
    return NextResponse.json({ error: "classId is required" }, { status: 400 });
  }

  // 3. Verify Class Access
  const { data: access } = await supabaseService
    .from("teacher_classes")
    .select("class_id")
    .eq("teacher_id", teacher.id)
    .eq("class_id", classId) // assuming teacher_classes has class_id column
    .single();

  if (!access) {
    // If teacher_classes uses class_name or other mapping, adjust here.
    // Based on search results, teacher_classes has class_id or class_name.
    // Assuming class_id for now as it's standard.
    return NextResponse.json({ error: "You do not have access to this class" }, { status: 403 });
  }

  // 4. Fetch Notices
  // Teacher only sees:
  // - notices created by themselves
  // - OR notices with scope='class' AND class_id = query.classId
  
  const { data, error } = await supabaseService
    .from("posts")
    .select("*")
    .eq("category", "notice")
    .eq("scope", "class")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
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

  // Verify Teacher
  const { data: teacher } = await supabaseService
    .from("teachers")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!teacher) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { class_id } = body;

    if (!class_id) return NextResponse.json({ error: "class_id is required" }, { status: 400 });

    // 2. Verify Class Access
    const { data: access } = await supabaseService
      .from("teacher_classes")
      .select("class_id")
      .eq("teacher_id", teacher.id)
      .eq("class_id", class_id)
      .single();

    if (!access) return NextResponse.json({ error: "You do not have access to this class" }, { status: 403 });

    // 3. Insert
    const payload = {
      title: body.title,
      content: body.content,
      category: "notice",
      notice_type: "learning", // Fixed for Teacher
      scope: "class", // Fixed for Teacher
      class_id: class_id,
      campus: null,
      creator_role: "teacher",
      author_id: user.id,
      is_pinned: body.is_pinned || false,
      is_archived: false,
    };

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
