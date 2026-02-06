//app/api/teacher/video-submissions/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

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

    // Check if user is teacher/admin
    const role = await resolveUserRole(user);
    const allowed = ["teacher", "admin", "master_teacher", "master_admin"];
    if (!allowed.includes(role)) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch Submissions
    const { data: submissions, error: subError } = await supabase
      .from("portal_video_submissions")
      .select("*")
      .eq("assignment_key", targetKey);

    if (subError) throw subError;

    // Fetch Feedback
    const { data: feedback, error: feedError } = await supabase
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
