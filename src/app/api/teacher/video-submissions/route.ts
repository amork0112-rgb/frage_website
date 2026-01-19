import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("assignmentId");

  if (!assignmentId) {
    return NextResponse.json({ error: "Missing assignmentId" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is teacher/admin
    const role = user.app_metadata?.role;
    if (role !== "teacher" && role !== "admin" && role !== "master_teacher" && role !== "master_admin") {
       // Fallback check in teachers table
       const { data: teacher } = await supabase
         .from("teachers")
         .select("role")
         .eq("auth_user_id", user.id)
         .maybeSingle();
       
       if (!teacher) {
         return NextResponse.json({ error: "Forbidden" }, { status: 403 });
       }
    }

    // Fetch Submissions
    const { data: submissions, error: subError } = await supabase
      .from("portal_video_submissions")
      .select("*")
      .eq("assignment_id", assignmentId);

    if (subError) throw subError;

    // Fetch Feedback
    const { data: feedback, error: feedError } = await supabase
      .from("portal_video_feedback")
      .select("*")
      .eq("assignment_id", assignmentId);

    if (feedError) throw feedError;

    return NextResponse.json({ submissions, feedback });

  } catch (err) {
    console.error("Error fetching video submissions:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
