import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServer();
    const { error: authError } = await requireAdmin(supabase);
    if (authError) return authError;

    const { studentId, classId, enabled } = await request.json();

    if (!studentId || !classId) {
      return NextResponse.json(
        { error: "Missing studentId or classId" },
        { status: 400 }
      );
    }

    if (enabled) {
      // Insert enrollment
      // Assuming simple link table. If status is needed, default might be set in DB or we can omit.
      const { error } = await supabase
        .from("enrollments")
        .insert({ student_id: studentId, class_id: classId });
      
      if (error) {
        // Ignore unique violation (already enrolled)
        if (error.code !== '23505') {
          throw error;
        }
      }
    } else {
      // Delete enrollment
      const { error } = await supabase
        .from("enrollments")
        .delete()
        .eq("student_id", studentId)
        .eq("class_id", classId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
