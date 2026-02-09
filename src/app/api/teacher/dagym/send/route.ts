import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { pushStore } from "@/server/store";

export const dynamic = "force-dynamic";

// Helper to simulate push trigger
async function triggerDagymPush(students: any[], date: string) {
  const now = new Date().toISOString();
  for (const student of students) {
    const pushItem = {
      id: `push-${student.id}-${Date.now()}`,
      studentId: student.id,
      message: `[코칭 결과 도착] 오늘 ${student.name} 학생의 수업 코칭 리포트가 도착했습니다. 앱에서 확인해주세요! 👏`,
      type: "today_coaching",
      createdAt: now,
      date: date,
    };
    const existingPush = pushStore.get(student.id) || [];
    pushStore.set(student.id, [pushItem, ...existingPush].slice(0, 50));
  }
}

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

    // 2. Teacher Check
    const { data: teacher, error: teacherError } = await supabaseService
      .from("teachers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (teacherError || !teacher) {
      return NextResponse.json({ error: "Forbidden: Teacher only" }, { status: 403 });
    }

    // 3. Check "Already Sent" (Prevention)
    const { data: alreadySent } = await supabaseService
      .from("daily_reports")
      .select("id")
      .eq("class_id", class_id)
      .eq("date", date)
      .eq("send_status", "sent")
      .maybeSingle();

    if (alreadySent) {
      return NextResponse.json(
        { error: "already_sent" },
        { status: 409 }
      );
    }

    // 4. Check "No Commitments" (Prevention)
    const { count: commitmentCount } = await supabaseService
      .from("student_commitments")
      .select("id", { count: "exact", head: true })
      .eq("class_id", class_id)
      .eq("date", date);

    if (!commitmentCount || commitmentCount === 0) {
      return NextResponse.json(
        { error: "no_commitments" },
        { status: 400 }
      );
    }

    // 5. Fetch Eligible Students (dajim_enabled = true)
    const { data: students, error: studentError } = await supabaseService
      .from("students")
      .select("id, student_name")
      .eq("main_class", class_id)
      .eq("dajim_enabled", true);

    if (studentError) {
      console.error("❌ Failed to fetch students:", studentError);
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ error: "no_eligible_students" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 6. Bulk Upsert (Source of Truth Update)
    const reports = students.map(s => ({
      student_id: s.id,
      class_id,
      date,
      send_status: "sent",
      sent_at: now,
      sent_by: user.id, // Added per user request
      updated_at: now
    }));

    const { error: upsertError } = await supabaseService
      .from("daily_reports")
      .upsert(reports, { onConflict: "student_id,class_id,date" });

    if (upsertError) {
      console.error("❌ Failed to bulk upsert reports:", upsertError);
      return NextResponse.json({ error: "Failed to save reports" }, { status: 500 });
    }

    // 7. Trigger Push (Async/Separated)
    await triggerDagymPush(students, date);

    // 8. Return Standard Response
    return NextResponse.json({
      ok: true,
      send_status: "sent",
      sent_at: now,
      sent_count: students.length
    });

  } catch (err) {
    console.error("🔥 SEND API ERROR", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
