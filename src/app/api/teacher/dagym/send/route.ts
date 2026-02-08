import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { pushStore } from "@/server/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { class_id, date } = body;

    if (!class_id || !date) {
      return NextResponse.json({ error: "Missing class_id or date" }, { status: 400 });
    }

    const supabase = createSupabaseServer();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Teacher Check (Source of Truth)
    const { data: teacher, error: teacherError } = await supabaseService
      .from("teachers")
      .select("id, role, campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (teacherError) {
      console.error("❌ teachers query failed", teacherError);
      return NextResponse.json({ error: "Teacher query error" }, { status: 500 });
    }

    if (!teacher) {
      return NextResponse.json({ error: "Forbidden: Teacher only" }, { status: 403 });
    }

    // 3. Fetch Eligible Students (dajim_enabled = true)
    const { data: students, error: studentError } = await supabaseService
      .from("students")
      .select("id, name")
      .eq("main_class", class_id)
      .eq("dajim_enabled", true);

    if (studentError) {
      console.error("❌ Failed to fetch students:", studentError);
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ sent_count: 0, message: "No eligible students found" });
    }

    const now = new Date().toISOString();
    const sentStudents = [];
    const failedStudents = [];

    // 4. Process each student
    for (const student of students) {
      try {
        // 4.1 Update Database (daily_reports)
        const { error: upsertError } = await supabaseService
          .from("daily_reports")
          .upsert(
            {
              student_id: student.id,
              class_id: class_id,
              date: date,
              send_status: "sent",
              sent_at: now,
              updated_at: now,
            },
            { onConflict: "student_id, date" }
          );

        if (upsertError) throw upsertError;

        // 4.2 Send Push Notification (Simulated via pushStore)
        // Payload: type: "today_coaching"
        const pushItem = {
          id: `push-${student.id}-${Date.now()}`,
          studentId: student.id,
          message: `[코칭 결과 도착] 오늘 ${student.name} 학생의 수업 코칭 리포트가 도착했습니다. 앱에서 확인해주세요! 👏`,
          type: "today_coaching",
          createdAt: now,
          date: date, // Custom field for deep linking context
        };
        
        const existingPush = pushStore.get(student.id) || [];
        pushStore.set(student.id, [pushItem, ...existingPush].slice(0, 50));

        sentStudents.push(student.id);
      } catch (err) {
        console.error(`Failed to send to student ${student.id}:`, err);
        failedStudents.push(student.id);
      }
    }

    return NextResponse.json({
      ok: true,
      sent_count: sentStudents.length,
      failed_count: failedStudents.length,
      sent_students: sentStudents
    });

  } catch (err) {
    console.error("❌ Unexpected error in send route:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
