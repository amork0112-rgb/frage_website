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

    // 3. Check for holidays (Blocking)
    // Source: 'holidays' table (NOT academic_calendar)
    // Rule: Block if date matches AND (affected_classes is NULL/Empty OR includes classId)
    const { data: holidays } = await supabaseService
      .from("holidays")
      .select("affected_classes")
      .eq("date", normalizedDate);

    let hasHoliday = false;
    if (holidays && holidays.length > 0) {
      hasHoliday = holidays.some((h: any) => {
        const classes = h.affected_classes;
        // If null or empty array -> Global holiday -> Block
        if (!classes || classes.length === 0) return true;
        // If has classes, check if classId is included
        return classes.includes(classId);
      });
    }

    // 4. Check for events (Special Dates)
    // Source: 'special_dates' table
    // Rule: Block if record exists for this date (Global or Class-specific)
    // We check if there is a special date entry that is either global (class_id is null) or specific to this class
    const { data: specialEvents } = await supabaseService
      .from("special_dates")
      .select("classes")
      .eq("date", normalizedDate);

    let hasEvent = false;

    if (specialEvents && specialEvents.length > 0) {
      hasEvent = specialEvents.some((e: any) => {
        const classes = e.classes;
        if (!classes || classes.length === 0) return true; // global
        return classes.includes(classId); // class-specific
      });
    }

    return NextResponse.json({
      alreadyGenerated,
      hasLesson,
      hasHoliday,
      hasEvent
    });

  } catch (e) {
    console.error("Status Check Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
