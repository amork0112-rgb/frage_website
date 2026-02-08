// app/api/teacher/dagym/status/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");
    const rawDate = searchParams.get("date");

    if (!classId || !rawDate) {
      return NextResponse.json({ error: "Missing class_id or date" }, { status: 400 });
    }

    // Normalize date to YYYY-MM-DD
    const normalizedDate = rawDate.slice(0, 10);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Check if already generated (any commitment exists for this class & date)
    const { data: existing } = await supabaseService
      .from("student_commitments")
      .select("id")
      .eq("class_id", classId)
      .eq("date", normalizedDate)
      .limit(1);
    
    const alreadyGenerated = (existing && existing.length > 0) || false;

    // 2. Check for lessons
    const { count: lessonCount } = await supabaseService
      .from("lesson_plans")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("date", normalizedDate);
    
    const hasLesson = (lessonCount !== null && lessonCount > 0);

    return NextResponse.json({
      alreadyGenerated,
      hasLesson
    });

  } catch (e) {
    console.error("Status Check Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
