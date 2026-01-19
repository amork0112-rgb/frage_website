import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check
    const role = user.app_metadata?.role ?? "parent";
    // Allow teachers and admins
    if (!["teacher", "master_teacher", "admin", "master_admin"].includes(role)) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, subjectUnit, className, releaseDate, dueDate } = body;

    if (!title || !className || !releaseDate || !dueDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Find Campus for the class
    // We use service key to bypass RLS for reading student data to find campus
    const { data: student, error: studentError } = await supabaseService
      .from("students")
      .select("campus")
      .eq("class_name", className)
      .limit(1)
      .maybeSingle();

    if (studentError) {
      console.error("Error fetching class campus:", studentError);
      return NextResponse.json({ error: "Failed to verify class" }, { status: 500 });
    }

    // If no student found, we might default or fail. 
    // Let's fail for now as assignments without students/campus are invalid in this system.
    if (!student?.campus) {
      return NextResponse.json({ error: "Class not found or no students in class" }, { status: 404 });
    }

    const campus = student.campus;

    // 2. Insert Assignment
    const payload: any = {
      title,
      class_name: className,
      campus,
      due_date: dueDate,
      release_date: releaseDate,
      unit: subjectUnit || null,
      created_at: new Date().toISOString(), // Explicitly set created_at if needed, or let DB default
    };

    const { data, error } = await supabaseService
      .from("video_assignments")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Insert assignment error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, assignment: data }, { status: 201 });

  } catch (error) {
    console.error("Create assignment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
