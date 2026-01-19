import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check
    const role = user.app_metadata?.role;
    const isTeacher = role === "teacher" || role === "admin" || role === "master_teacher" || role === "master_admin";
    if (!isTeacher) {
       const { data: teacher } = await supabase.from("teachers").select("role").eq("auth_user_id", user.id).maybeSingle();
       if (!teacher) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      assignment_id, 
      student_id, 
      overall_message, 
      strengths, 
      focus_point, 
      next_try_guide, 
      fluency, 
      volume, 
      speed, 
      pronunciation, 
      performance 
    } = body;

    if (!assignment_id || !student_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if feedback exists
    const { data: existing } = await supabase
      .from("portal_video_feedback")
      .select("id")
      .eq("assignment_id", assignment_id)
      .eq("student_id", student_id)
      .maybeSingle();

    let result;
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from("portal_video_feedback")
        .update({
          overall_message,
          strengths,
          focus_point,
          next_try_guide,
          fluency,
          volume,
          speed,
          pronunciation,
          performance,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from("portal_video_feedback")
        .insert({
          assignment_id,
          student_id,
          overall_message,
          strengths,
          focus_point,
          next_try_guide,
          fluency,
          volume,
          speed,
          pronunciation,
          performance
        })
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, data: result });

  } catch (err) {
    console.error("Error saving feedback:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
