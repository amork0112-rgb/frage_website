import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let role = user.app_metadata?.role;
    let teacherId: string | null = null;

    // Fallback: Check teachers table
    if (!role || role === "parent") {
      const { data: teacher } = await supabaseService
        .from("teachers")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      
      if (teacher) {
        if (teacher.role) role = teacher.role;
        teacherId = teacher.id;
      }
    } else {
      // If role is in metadata, still fetch teacher ID
      const { data: teacher } = await supabaseService
        .from("teachers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (teacher) teacherId = teacher.id;
    }

    // Fallback: Hardcoded check for master_teacher email
    if (user.email === "master_teacher@frage.com") {
      role = "master_teacher";
    }

    if (!["teacher", "master_teacher", "admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: Teacher only" }, { status: 403 });
    }

    // 2. Query Params
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    // 3. Build Query
    let query = supabaseService
      .from("posts")
      .select("*")
      .eq("category", "notice")
      .eq("scope", "class")
      .order("created_at", { ascending: false });

    // If classId provided, filter by it (and verify access if needed)
    if (classId) {
      // Verify access if not master/admin
      if (role === "teacher" && teacherId) {
        const { data: access } = await supabaseService
          .from("teacher_classes")
          .select("class_id")
          .eq("teacher_id", teacherId)
          .eq("class_id", classId)
          .maybeSingle();
        
        if (!access) {
           return NextResponse.json({ error: "You do not have access to this class" }, { status: 403 });
        }
      }
      query = query.eq("class_id", classId);
    } else {
      // If no classId, teacher sees notices they authored
      // OR notices for their classes? 
      // For now, let's show notices they authored to keep it simple and safe
      // If master_teacher, maybe show all?
      if (role !== "master_teacher" && role !== "admin") {
         query = query.eq("author_id", user.id);
      }
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data }); // UI expects { items: [] } or just []? Page says data.items || []
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let role = user.app_metadata?.role;
    let teacherId: string | null = null;

    // Fallback: Check teachers table
    if (!role || role === "parent") {
      const { data: teacher } = await supabaseService
        .from("teachers")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      
      if (teacher) {
        if (teacher.role) role = teacher.role;
        teacherId = teacher.id;
      }
    } else {
       const { data: teacher } = await supabaseService
        .from("teachers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (teacher) teacherId = teacher.id;
    }

    if (user.email === "master_teacher@frage.com") {
      role = "master_teacher";
    }

    if (!["teacher", "master_teacher", "admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { class_id } = body;

    if (!class_id) return NextResponse.json({ error: "class_id is required" }, { status: 400 });

    // Verify Class Access
    if (role === "teacher" && teacherId) {
      const { data: access } = await supabaseService
        .from("teacher_classes")
        .select("class_id")
        .eq("teacher_id", teacherId)
        .eq("class_id", class_id)
        .maybeSingle();

      if (!access) return NextResponse.json({ error: "You do not have access to this class" }, { status: 403 });
    }

    // Insert
    const payload = {
      title: body.title,
      content: body.content,
      category: "notice",
      notice_type: "learning",
      scope: "class",
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
