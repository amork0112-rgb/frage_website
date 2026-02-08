import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { class_id, date } = body;

    if (!class_id || !date) {
      return NextResponse.json({ error: "Missing class_id or date" }, { status: 400 });
    }

    // 1. Auth Check
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Teacher Check
    const { data: teacher, error: teacherError } = await supabaseService
      .from("teachers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (teacherError || !teacher) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Fetch Students in Class
    const { data: students, error: studentError } = await supabaseService
      .from("students")
      .select("id")
      .eq("main_class", class_id)
      .eq("dajim_enabled", true);

    if (studentError || !students || students.length === 0) {
      return NextResponse.json({ ok: true, sent_count: 0 });
    }

    // 4. Bulk Upsert to daily_reports
    const reports = students.map(s => ({
      student_id: s.id,
      class_id,
      date,
      send_status: "sent",
      sent_at: new Date().toISOString()
    }));

    const { error: upsertError } = await supabaseService
      .from("daily_reports")
      .upsert(reports, { onConflict: "student_id,class_id,date" });

    if (upsertError) {
      console.error("Failed to upsert daily_reports:", upsertError);
      return NextResponse.json({ error: "Failed to save reports" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sent_count: students.length });

  } catch (e) {
    console.error("Send reports error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
