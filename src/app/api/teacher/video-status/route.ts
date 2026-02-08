//app/api/teacher/video-status/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

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

    // Use a service client or direct query if RLS is an issue, but standard client should work if policies allow reading view
    // Assuming v_lesson_video_status is accessible to teachers
    const { data, error } = await supabaseService
      .from("v_lesson_video_status")
      .select(`
        lesson_plan_id,
        lesson_date,
        class_id,
        class_name,
        campus,
        book_id,
        unit_no,
        day_no,
        has_auto_video
      `)
      .eq("lesson_date", date)
      .eq("has_auto_video", true)
      .not("class_id", "is", null)
      .order("campus", { ascending: true })
      .order("class_name", { ascending: true });

    if (error) {
      console.error("Error fetching video status:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      date,
      lessons: data || []
    });

  } catch (error) {
    console.error("Video status API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
