//app/api/teacher/video-submissions/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assignmentKey = searchParams.get("assignmentKey");
  const assignmentId = searchParams.get("assignmentId");

  // Support both assignmentKey and assignmentId (for manual assignments where key = id)
  const targetKey = assignmentKey || assignmentId;

  if (!targetKey) {
    return NextResponse.json({ error: "Missing assignmentKey or assignmentId" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Teacher Check (DB Source of Truth)
    // Use supabaseService for role check to avoid RLS on teachers table if needed,
    // though createSupabaseServer() might work if RLS allows self-read.
    // Given the pattern, let's use supabaseService for the role check to be safe and consistent.
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

    // Fetch Submissions
    // NOTE: Using supabaseService here as well to ensure consistent data access without RLS blocking teacher view of student data
    const { data: submissions, error: subError } = await supabaseService
      .from("portal_video_submissions")
      .select("*")
      .eq("assignment_key", targetKey);

    if (subError) throw subError;

    // Fetch Feedback
    const { data: feedback, error: feedError } = await supabaseService
      .from("portal_video_feedback")
      .select("*")
      .eq("assignment_key", targetKey);

    if (feedError) throw feedError;

    return NextResponse.json({ submissions, feedback });

  } catch (err) {
    console.error("Error fetching video submissions:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
