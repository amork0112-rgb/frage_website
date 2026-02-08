import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Teacher Check (DB Source of Truth)
    const { data: teacher } = await supabaseService
      .from("teachers")
      .select("id, role, campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!teacher) {
      return NextResponse.json({ error: "Forbidden: Teacher only" }, { status: 403 });
    }
    
    // Only admin or master_teacher can auto-assign
    if (!["admin", "master_teacher"].includes(teacher.role)) {
       return NextResponse.json({ error: "Forbidden: Master Teacher or Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // 1. Fetch eligible lessons from View
    // logic: has_auto_video = true AND lesson_date = target_date
    const { data: lessons, error: lessonError } = await supabaseService
      .from("v_lesson_video_status")
      .select("*")
      .eq("has_auto_video", true)
      .eq("lesson_date", dateStr);

    if (lessonError) throw lessonError;
    if (!lessons || lessons.length === 0) {
      return NextResponse.json({ message: "No auto-video lessons found for this date.", created: 0 });
    }

    // 2. Fetch active students for these classes
    const classNames = Array.from(new Set(lessons.map(l => l.class_name).filter(Boolean)));
    
    // We need student_id and class_name to map them
    const { data: students, error: studentError } = await supabaseService
      .from("v_students_full")
      .select("student_id, class_name")
      .eq("status", "active")
      .in("class_name", classNames);

    if (studentError) throw studentError;

    const studentMap: Record<string, string[]> = {};
    students?.forEach(s => {
      if (!studentMap[s.class_name]) studentMap[s.class_name] = [];
      studentMap[s.class_name].push(s.student_id);
    });

    // 3. Prepare Inserts (Idempotent)
    // We'll filter out existing commitments for this date to avoid duplicates.
    // Assuming unique constraint might not be perfect, checking existing is safer.

    const { data: existing } = await supabaseService
      .from("student_commitments")
      .select("student_id, book_id")
      .eq("date", dateStr);

    const existingSet = new Set(existing?.map(e => `${e.student_id}_${e.book_id}`));
    const inserts: any[] = [];

    for (const lesson of lessons) {
      const studentIds = studentMap[lesson.class_name] || [];
      for (const sid of studentIds) {
        // Idempotency Check
        if (existingSet.has(`${sid}_${lesson.book_id}`)) {
          continue;
        }

        // Add to inserts
        // Note: class_id is needed. v_lesson_video_status has class_id from lesson_plans.
        if (lesson.book_id && lesson.class_id) {
            inserts.push({
                student_id: sid,
                book_id: lesson.book_id,
                class_id: lesson.class_id,
                date: dateStr,
                status: "unchecked"
            });
            // Add to set to prevent double insertion if logic somehow produces duplicates
            existingSet.add(`${sid}_${lesson.book_id}`);
        }
      }
    }

    let createdCount = 0;
    if (inserts.length > 0) {
      const { error: insertError } = await supabaseService
        .from("student_commitments")
        .insert(inserts);
      
      if (insertError) throw insertError;
      createdCount = inserts.length;
    }

    return NextResponse.json({ 
      message: "Auto-assign completed successfully", 
      created: createdCount,
      date: dateStr 
    });

  } catch (error: any) {
    console.error("Auto-assign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
