import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    const { error: authError } = await requireAdmin(supabase);
    if (authError) return authError;

    const studentId = params.id;
    const body = await request.json();
    const { main_class_id, program_class_ids } = body;

    // 1. Update Main Class (if provided)
    if (main_class_id !== undefined) {
      // Allow null to clear class
      const { error: mainError } = await supabase
        .from("students")
        .update({ main_class_id: main_class_id || null })
        .eq("id", studentId);
      
      if (mainError) throw mainError;
    }

    // 2. Update Program Classes (if provided)
    if (Array.isArray(program_class_ids)) {
      // Fetch current active program enrollments
      const { data: currentEnrollments, error: fetchError } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId)
        .eq("enrollment_type", "program")
        .eq("status", "active");

      if (fetchError) throw fetchError;

      const currentIds = new Set(currentEnrollments.map((e) => e.class_id));
      const newIds = new Set(program_class_ids);

      // Determine additions and removals
      const toAdd = program_class_ids.filter((id) => !currentIds.has(id));
      const toEnd = Array.from(currentIds).filter((id) => !newIds.has(id));

      // Add new enrollments
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("enrollments")
          .insert(
            toAdd.map((classId) => ({
              student_id: studentId,
              class_id: classId,
              enrollment_type: "program",
              status: "active",
            }))
          );
        if (insertError) throw insertError;
      }

      // End removed enrollments
      if (toEnd.length > 0) {
        const { error: updateError } = await supabase
          .from("enrollments")
          .update({ status: "ended", updated_at: new Date().toISOString() })
          .eq("student_id", studentId)
          .eq("enrollment_type", "program")
          .in("class_id", toEnd);
        if (updateError) throw updateError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
