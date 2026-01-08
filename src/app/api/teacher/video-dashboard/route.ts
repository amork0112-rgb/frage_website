import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ assignments: [] }, { status: 401 });
    const role = user.app_metadata?.role ?? "parent";
    if (role !== "teacher") return NextResponse.json({ assignments: [] }, { status: 403 });
    const { data: assignments } = await supabaseService
      .from("video_assignments")
      .select("*")
      .order("due_date", { ascending: true });

    const { data: submissions } = await supabaseService
      .from("portal_video_submissions")
      .select("*");

    const { data: feedbacks } = await supabaseService
      .from("portal_video_feedback")
      .select("*");

    const { data: students } = await supabaseService
      .from("students")
      .select("*");

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
