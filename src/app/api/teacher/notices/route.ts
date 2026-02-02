import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

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

    const role = await resolveUserRole(user);
    let teacherId: string | null = null;

    if (role === "teacher") {
      const { data: teacher } = await supabaseService
        .from("teachers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (teacher) teacherId = teacher.id;
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
      .select(`
        id,
        title,
        content,
        category,
        scope,
        class_id,
        creator_id,
        created_at
      `)
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
         query = query.eq("creator_id", user.id);
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

    const role = await resolveUserRole(user);
    if (!["teacher", "master_teacher", "admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const { title, content, class_ids } = json;

    if (!title || !content || !class_ids || !Array.isArray(class_ids)) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Insert for each class
    // Notice type: 'notice' (default)
    // Scope: 'class'
    const payload = class_ids.map((classId: string) => ({
      title,
      content,
      class_id: classId,
      creator_id: user.id,
      category: "notice",
      scope: "class",
      published: true,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabaseService.from("posts").insert(payload);

    if (error) {
      console.error("INSERT ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing id" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServer();

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
