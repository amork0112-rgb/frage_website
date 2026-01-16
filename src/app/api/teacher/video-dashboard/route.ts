import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { mockAIGrading } from "@/lib/ai/grading";
// RLS enforced: use SSR client only

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ assignments: [] }, { status: 401 });
    const role = user.app_metadata?.role ?? "parent";
    const teacherRoles = ["teacher", "master_teacher"];
    if (!teacherRoles.includes(role)) return NextResponse.json({ assignments: [] }, { status: 403 });

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

    const { data: submissions } = await supabase
      .from("portal_video_submissions")
      .select("*");

    const { data: feedbacks } = await supabase
      .from("portal_video_feedback")
      .select("*");

    const { data: students } = await supabase
      .from("students")
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
          teacher_feedback_draft: mock.teacher_feedback_draft,
          parent_report_message: mock.parent_report_message,
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

    const enriched = (assignments || []).map((a: any) => {
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
                teacher_feedback_draft: ai.teacher_feedback_draft,
                parent_report_message: ai.parent_report_message,
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

    return NextResponse.json({ assignments: enriched }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ assignments: [] }, { status: 200 });
  }
}
