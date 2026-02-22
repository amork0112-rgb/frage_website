import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Teacher Check (DB Source of Truth)
    const { data: teacher, error: teacherError } = await supabaseService
      .from("teachers")
      .select("id, role, campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (teacherError) {
      console.error("❌ teachers query failed", teacherError);
      return NextResponse.json(
        { error: "Teacher query error" },
        { status: 500 }
      );
    }

    if (!teacher) {
      return NextResponse.json({ error: "Forbidden: Teacher only" }, { status: 403 });
    }

    // New logic: Fetch all submitted video submissions and join with relevant tables
    const { data: submissions, error: submissionsError } = await supabaseService
      .from("portal_video_submissions")
      .select(
        `
        assignment_key,
        student_id,
        video_path,
        status,
        created_at,
        students:student_id (
          id,
          name,
          english_name,
          class_name,
          campus
        ),
        ai_evaluation:ai_video_evaluations!left(
          overall_message,
          fluency,
          volume,
          speed,
          pronunciation,
          performance,
          strengths,
          focus_point,
          next_try_guide,
          parent_report_message,
          average,
          pronunciation_flags,
          needs_teacher_review,
          ai_confidence
        ),
        teacher_feedback:portal_video_feedback!left(
          overall_message,
          fluency,
          volume,
          speed,
          pronunciation,
          performance,
          strengths,
          focus_point,
          next_try_guide,
          parent_report_message,
          teacher_name,
          created_at
        )
        `
      )
      .eq("status", "submitted")
      .order("created_at", { ascending: false });

    if (submissionsError) {
      console.error("❌ portal_video_submissions query failed", submissionsError);
      return NextResponse.json(
        { error: "Submission query error" },
        { status: 500 }
      );
    }

    // Transform data to the desired output format for the dashboard
    const items = submissions.map(sub => {
      const student = (sub.students as any)?.[0]; // Access the first student object if students is an array
      const aiEvaluation = (sub.ai_evaluation as any)?.[0];
      const teacherFeedback = (sub.teacher_feedback as any)?.[0];

      // Determine student name to display
      const studentDisplayName = student?.english_name || student?.name || "Unknown Student";

      return {
        assignment_key: sub.assignment_key,
        student_id: sub.student_id,
        student_name: studentDisplayName,
        class_name: student?.class_name,
        campus: student?.campus,
        submission_status: sub.status,
        video_path: sub.video_path,
        submitted_at: sub.created_at,
        ai_evaluation: aiEvaluation ? {
          overall_message: aiEvaluation.overall_message,
          fluency: aiEvaluation.fluency,
          volume: aiEvaluation.volume,
          speed: aiEvaluation.speed,
          pronunciation: aiEvaluation.pronunciation,
          performance: aiEvaluation.performance,
          strengths: aiEvaluation.strengths,
          focus_point: aiEvaluation.focus_point,
          next_try_guide: aiEvaluation.next_try_guide,
          parent_report_message: aiEvaluation.parent_report_message,
          average: aiEvaluation.average,
          pronunciation_flags: aiEvaluation.pronunciation_flags,
          needs_teacher_review: aiEvaluation.needs_teacher_review,
          ai_confidence: aiEvaluation.ai_confidence,
        } : null,
        teacher_feedback: teacherFeedback ? {
          overall_message: teacherFeedback.overall_message,
          fluency: teacherFeedback.fluency,
          volume: teacherFeedback.volume,
          speed: teacherFeedback.speed,
          pronunciation: teacherFeedback.pronunciation,
          performance: teacherFeedback.performance,
          strengths: teacherFeedback.strengths,
          focus_point: teacherFeedback.focus_point,
          next_try_guide: teacherFeedback.next_try_guide,
          parent_report_message: teacherFeedback.parent_report_message,
          teacher_name: teacherFeedback.teacher_name,
          created_at: teacherFeedback.created_at,
        } : null,
      };
    });

    return NextResponse.json({ items });

  } catch (error: any) {
    console.error("Teacher Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
