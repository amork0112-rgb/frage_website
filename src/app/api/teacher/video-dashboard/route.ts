import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { mockAIGrading, generateFeedbackDraft } from "@/lib/ai/grading";

function computeKinderWeekMeta(now: Date) {
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
  
  const dayOfWeek = now.getDay();
  const daysUntilSunday = 7 - dayOfWeek;
  const due = new Date(now);
  due.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  const dueDate = due.toISOString().split("T")[0];
  
  // Calculate Week Range (Mon - Sun)
  const mon = new Date(now);
  const daysToMon = (dayOfWeek + 6) % 7;
  mon.setDate(now.getDate() - daysToMon);
  
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekRange = `${fmt(mon)} – ${fmt(sun)}`;

  return { 
    weekNum, 
    dueDate, 
    weekRange 
  };
}

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ assignments: [] }, { status: 401 });
    // Role check
    let role = user.app_metadata?.role ?? "parent";

    // Fallback: Check teachers table if role is parent (sometimes metadata lags)
    if (role === "parent") {
      const { data: teacher } = await supabaseService
        .from("teachers")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (teacher?.role) {
        role = teacher.role;
      }
    }

    // Fallback: Hardcode master teacher email if needed
    if (user.email === "master_teacher@frage.com") {
      role = "master_teacher";
    }

    const teacherRoles = ["teacher", "master_teacher"];
    if (!teacherRoles.includes(role)) {
      return NextResponse.json({ assignments: [] }, { status: 403 });
    }

    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!teacher?.id) {
      return NextResponse.json({ assignments: [] }, { status: 403 });
    }

    const isDev = process.env.NODE_ENV !== "production";

    const { data: assignments } = await supabase
      .from("video_assignments")
      .select("*")
      .order("due_date", { ascending: true });

    // --- New Logic for Dashboard UI ---
    
    // Determine Division based on teacher's classes
    const { data: teacherClassesData } = await supabaseService
      .from("teacher_classes")
      .select("class_name")
      .eq("teacher_id", teacher.id);
    
    const teacherClasses = (teacherClassesData || []).map((row: any) => row.class_name);
    const KINDER_CLASSES = ["Kepler", "Platon", "Euclid", "Darwin", "Gauss", "Edison", "Thales"];
    const isKinder = teacherClasses.some((c: string) => KINDER_CLASSES.some(k => c.includes(k)));
    const division = isKinder ? "KINDER" : "PRIMARY";

    // Fetch students (needed for both upcoming calc and assignment enrichment)
    const { data: students } = await supabase
      .from("students")
      .select("*");

    let engineStatus;
    let upcomingAssignments: any[] = [];

    if (division === "KINDER") {
      // 1. Calculate Engine Status (Kinder)
      const latestAssignment = assignments?.[assignments.length - 1];
      const lastRunDate = latestAssignment?.created_at 
        ? new Date(latestAssignment.created_at) 
        : new Date();
      
      const lastRunStr = lastRunDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " · Success";
      
      const now = new Date();
      const nextMon = new Date(now);
      nextMon.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
      nextMon.setHours(9, 0, 0, 0);
      const diffDays = Math.ceil((nextMon.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const nextRunStr = nextMon.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ` · In ${diffDays} days`;

      engineStatus = {
        active: true,
        division: "Kinder (Automatic)",
        generation: "Weekly · Monday 09:00",
        source: "Textbook Progress + Session Log",
        lastRun: lastRunStr,
        nextRun: nextRunStr
      };

      // 2. Calculate Upcoming Assignments (Kinder)
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const nextMeta = computeKinderWeekMeta(nextWeekDate);
      
      const kinderCount = (students || []).filter((s: any) => 
        KINDER_CLASSES.some(k => (s.class_name || "").includes(k))
      ).length;

      upcomingAssignments = [
        {
          week: nextMeta.weekRange,
          class_name: "Kinder · International",
          textbook: "Phonics Show 4",
          unit: "Unit 3",
          students_count: kinderCount || 18,
          status: "Scheduled (Auto)"
        }
      ];
    } else {
      // Primary (Manual)
      engineStatus = {
        active: false,
        division: "Primary (Manual)",
        generation: "Manual Creation",
        source: "Teacher Created",
        lastRun: "-",
        nextRun: "-"
      };
      upcomingAssignments = [];
    }

    // --- End New Logic ---

    const { data: submissions } = await supabase
      .from("portal_video_submissions")
      .select("*");

    const { data: feedbacks } = await supabase
      .from("portal_video_feedback")
      .select("*");

    let { data: aiEvals } = await supabase
      .from("ai_video_evaluations")
      .select("*");

    if (isDev && submissions && students) {
      const existingBySub: Record<string, boolean> = {};
      (aiEvals || []).forEach((ai: any) => {
        if (ai?.submission_id) existingBySub[String(ai.submission_id)] = true;
      });

      const inserts: any[] = [];
      submissions.forEach((sub: any) => {
        const subId = String(sub.id ?? "");
        if (!subId || existingBySub[subId]) return;
        const studentId = String(sub.student_id ?? "");
        const assignmentId = String(sub.assignment_id ?? "");
        if (!studentId || !assignmentId) return;
        const student = (students || []).find((st: any) => String(st.id ?? st.student_id ?? "") === studentId);
        const name = String(student?.english_name ?? student?.student_name ?? "Student");
        const mock = mockAIGrading(name, "");
        inserts.push({
          submission_id: subId,
          assignment_id: assignmentId,
          student_id: studentId,
          scores: mock.scores,
          average: mock.average,
          pronunciation_flags: mock.pronunciation_flags,
          needs_teacher_review: mock.needs_teacher_review,
          ai_confidence: mock.ai_confidence
        });
      });

      if (inserts.length > 0) {
        await supabase.from("ai_video_evaluations").insert(inserts);
        const refreshed = await supabase.from("ai_video_evaluations").select("*");
        aiEvals = refreshed.data || aiEvals;
      }
    }

    const subByAssign: Record<string, any[]> = {};
    (submissions || []).forEach((s: any) => {
      const aid = String(s.assignment_id ?? s.assignmentId ?? "");
      if (!subByAssign[aid]) subByAssign[aid] = [];
      subByAssign[aid].push(s);
    });

    const fbByKey: Record<string, any> = {};
    (feedbacks || []).forEach((f: any) => {
      const key = `${f.assignment_id ?? f.assignmentId}_${f.student_id ?? f.studentId}`;
      const prev = fbByKey[key];
      if (!prev || new Date(f.updated_at ?? f.updatedAt ?? 0).getTime() > new Date(prev.updated_at ?? prev.updatedAt ?? 0).getTime()) {
        fbByKey[key] = f;
      }
    });

    const aiBySub: Record<string, any> = {};
    (aiEvals || []).forEach((ai: any) => {
      if (ai?.submission_id) aiBySub[String(ai.submission_id)] = ai;
    });

    const studentsByClassCampus: Record<string, any[]> = {};
    (students || []).forEach((st: any) => {
      const cls = String(st.class_name ?? st.className ?? "");
      const camp = String(st.campus ?? "");
      const key = `${cls}__${camp}`;
      if (!studentsByClassCampus[key]) studentsByClassCampus[key] = [];
      studentsByClassCampus[key].push(st);
    });

    const visibleAssignments = (assignments || []).filter((a: any) => {
      const desc = String(a.description || "");
      if (desc.startsWith("[DRAFT]")) return false;
      if (desc.startsWith("[SKIP]")) return false;
      return true;
    });

    const enriched = visibleAssignments.map((a: any) => {
      const aid = String(a.id ?? a.assignment_id ?? "");
      const cls = String(a.class_name ?? a.className ?? "");
      const camp = String(a.campus ?? "");
      const due = String(a.due_date ?? a.dueDate ?? "");
      const key = `${cls}__${camp}`;
      const baseStudents = studentsByClassCampus[key] || [];
      const subs = subByAssign[aid] || [];
      const subByStudent: Record<string, any> = {};
      subs.forEach((s) => {
        subByStudent[String(s.student_id ?? s.studentId ?? "")] = s;
      });
      const studentsList = baseStudents.map((st: any) => {
        const sid = String(st.id ?? st.student_id ?? "");
        const sub = subByStudent[sid];
        const fbKey = `${aid}_${sid}`;
        const fb = fbByKey[fbKey];

        const ai = sub ? aiBySub[String(sub.id)] : null;

        return {
          student_id: sid,
          student_name: String(st.student_name ?? st.name ?? ""),
          english_name: String(st.english_name ?? st.englishName ?? ""),
          submission: sub
            ? {
                id: String(sub.id ?? ""),
                video_path: String(sub.video_path ?? ""),
                status: String(sub.status ?? "submitted"),
              }
            : null,
          feedback: fb
            ? {
                id: String(fb.id ?? ""),
                average: Number(fb.average ?? 0),
                updated_at: String(fb.updated_at ?? fb.updatedAt ?? ""),
              }
            : null,
          ai_evaluation: ai
            ? {
                scores: ai.scores,
                average: ai.average,
                pronunciation_flags: ai.pronunciation_flags,
                teacher_feedback_draft: ai.teacher_feedback_draft || generateFeedbackDraft(ai.scores, String(st.student_name ?? st.name ?? "Student")),
                parent_report_message: ai.parent_report_message || "AI Analysis completed.",
                needs_teacher_review: ai.needs_teacher_review,
                ai_confidence: ai.ai_confidence
              }
            : null
        };
      });
      return {
        assignment_id: aid,
        title: String(a.title ?? ""),
        due_date: due,
        class_name: cls,
        campus: camp,
        students: studentsList,
      };
    });

    return NextResponse.json({ 
      assignments: enriched,
      engine_status: engineStatus,
      upcoming_assignments: upcomingAssignments
    }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ assignments: [] }, { status: 200 });
  }
}
