import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    console.log("📹 [VIDEO PORTAL] =========================== START");

    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    console.log("🔐 Auth User:", user?.id);

    if (!user) {
      console.log("❌ No auth user");
      return NextResponse.json({ items: [] }, { status: 401 });
    }

    // 1️⃣ Parent 찾기
    const { data: parent } = await supabaseService
      .from("parents")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    console.log("👨‍👩‍👧 Parent Row:", parent);

    if (!parent) {
      console.log("❌ Parent not found for auth_user_id");
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    // 2️⃣ Student 찾기 (parent_id로 조회, 여러 명일 수 있으므로 첫 번째 학생 선택)
    const { data: students } = await supabaseService
      .from("students")
      .select("id, name, english_name, main_class, class_name, campus") // Select relevant student fields
      .eq("parent_id", parent.id);

    console.log("🎓 Students:", students);

    const student = students?.[0];

    if (!student) {
      console.log("❌ No student found for parent_id");
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    console.log("🎓 Selected Student ID:", student.id);
    console.log("🏫 Student Main Class:", student.main_class);
    console.log("🏫 Student Class Name:", student.class_name);


    // 3️⃣ Fetch all video submissions for the student, regardless of status
    // Join with AI evaluations and teacher feedback
    const { data: submissions, error: submissionsError } = await supabaseService
      .from("portal_video_submissions")
      .select(
        `
        assignment_key,
        video_path,
        status,
        created_at,
        ai_evaluation:ai_video_evaluations!left(
          overall_message, fluency, volume, speed, pronunciation, performance,
          strengths, focus_point, next_try_guide, parent_report_message,
          average, pronunciation_flags, needs_teacher_review, ai_confidence
        ),
        teacher_feedback:portal_video_feedback!left(
          overall_message, fluency, volume, speed, pronunciation, performance,
          strengths, focus_point, next_try_guide, parent_report_message,
          teacher_name, created_at
        )
        `
      )
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });

    if (submissionsError) {
      console.error("❌ Error fetching submissions:", submissionsError);
      return NextResponse.json({ items: [] }, { status: 500 });
    }

    console.log("📤 Submissions Count:", submissions?.length);

    // 4️⃣ Map submissions to the desired output format for the portal
    const items = (submissions || []).map(sub => {
      const aiEvaluation = (sub.ai_evaluation as any)?.[0]; // Access first element if array
      const teacherFeedback = (sub.teacher_feedback as any)?.[0]; // Access first element if array

      // Determine status for display
      let displayStatus: "Pending" | "Submitted" | "Reviewed" | "Overdue" = "Submitted"; // Default to Submitted if present
      if (sub.status === "pending") {
        displayStatus = "Pending";
      } else if (sub.status === "submitted" && (aiEvaluation || teacherFeedback)) {
        displayStatus = "Reviewed";
      }

      // Derive title and module from assignment_key
      // Assuming assignment_key format is "TITLE_MODULE_studentId" or "MODULE_studentId"
      const assignmentKeyParts = sub.assignment_key.split('_');
      let title = "Video Assignment";
      let moduleName = assignmentKeyParts[0];
      if (assignmentKeyParts.length > 2) {
          title = assignmentKeyParts[0].replace(/-/g, ' '); // Replace hyphens for readability
          moduleName = assignmentKeyParts[1];
      } else if (assignmentKeyParts.length === 2) {
          title = assignmentKeyParts[0].replace(/-/g, ' ');
          moduleName = assignmentKeyParts[0]; // If only two parts, module can be the first part
      }
      title = title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); // Capitalize each word


      // Provide a generic due date or null as it's not explicitly stored with submission
      const dueDate = null; // Or try to infer from assignment_key if a pattern exists

      return {
        id: sub.assignment_key,
        title: title,
        module: moduleName,
        dueDate: dueDate,
        status: displayStatus,
        score: aiEvaluation?.average || null, // Use AI average score if available
        videoUrl: sub.video_path || null,
        feedback: {
          ai: aiEvaluation ? {
            overall_message: aiEvaluation.overall_message,
            strengths: aiEvaluation.strengths,
            focus_point: aiEvaluation.focus_point,
            next_try_guide: aiEvaluation.next_try_guide,
            parent_report_message: aiEvaluation.parent_report_message,
            average: aiEvaluation.average,
          } : null,
          teacher: teacherFeedback ? {
            overall_message: teacherFeedback.overall_message,
            strengths: teacherFeedback.strengths,
            focus_point: teacherFeedback.focus_point,
            next_try_guide: teacherFeedback.next_try_guide,
            parent_report_message: teacherFeedback.parent_report_message,
            teacher_name: teacherFeedback.teacher_name,
          } : null,
        }
      };
    });

    console.log("📹 [VIDEO PORTAL END] =========================== END");

    return NextResponse.json({ items }, { status: 200 });

  } catch (err) {
    console.error("🔥 VIDEO API ERROR:", err);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}

// mapScore function is no longer directly used for display status in this API
// but can be kept if needed elsewhere or for future features.
function mapScore(n: number, type: "fluency" | "volume" | "speed" | "pronunciation" | "performance") {
  if (type === "volume") return n >= 4 ? "Strong" : n === 3 ? "Clear" : n === 2 ? "Developing" : "Needs Support";
  if (type === "speed") return n >= 4 ? "Natural" : n === 3 ? "Appropriate" : n === 2 ? "Developing" : "Too Slow";
  if (type === "pronunciation") return n >= 4 ? "Consistently Precise" : n === 3 ? "Mostly Accurate" : n === 2 ? "Developing" : "Needs Support";
  if (type === "performance") return n >= 4 ? "Engaging" : n === 3 ? "Focused" : n === 2 ? "Developing" : "Needs Support";
  return n >= 4 ? "Excellent" : n === 3 ? "Appropriate" : n === 2 ? "Developing" : "Needs Support";
}
