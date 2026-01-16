import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET(request: Request) {
  try {
    // 1. Get Kinder Classes (International Campus)
    const { data: classes, error: classError } = await supabaseService
      .from("classes")
      .select("name")
      .eq("campus", "International")
      .eq("division", "kinder");

    if (classError) {
      console.error("Error fetching classes:", classError);
      return NextResponse.json({ success: false, error: classError.message }, { status: 500 });
    }

    if (!classes || classes.length === 0) {
      return NextResponse.json({ message: "No Kinder classes found" });
    }

    // 2. Determine Assignment Details for the current week
    const now = new Date();
    // Simple week number calculation
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);

    const title = `Week ${weekNum} Reading`;
    const moduleName = `Week ${weekNum}`;
    const description = "Video assignments for Kinder classes are generated automatically each week.";
    
    // Due Date: Next Sunday
    // If today is Sunday (0), next Sunday is today + 7? Or today?
    // Let's assume due date is upcoming Sunday.
    const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
    const daysUntilSunday = 7 - dayOfWeek; 
    // If today is Sunday, set to next Sunday (7 days later) or today?
    // Usually due date is end of week. If generated on Monday, due Sunday.
    // If generated on Sunday, due next Sunday.
    const due = new Date(now);
    due.setDate(now.getDate() + (daysUntilSunday === 0 ? 0 : daysUntilSunday)); 
    // Wait, if today is Sunday (0), 7-0 = 7 (next Sunday). 
    // If today is Monday (1), 7-1 = 6 (this Sunday).
    // Let's stick to "This Sunday" if run early in week, or "Next Sunday".
    // I'll just set it to "Next Sunday" logic relative to run time.
    // Ideally, this script runs on Monday. Then Due is Sunday.
    
    const dueDateStr = due.toISOString().split('T')[0];

    const results = [];

    // 3. Process each class
    for (const cls of classes) {
      const className = cls.name;
      if (!className) continue;
      
      // Check existence to avoid duplicates
      const { data: existing } = await supabaseService
        .from("video_assignments")
        .select("id")
        .eq("class_name", className)
        .eq("title", title)
        .maybeSingle();

      if (!existing) {
        const { data: inserted, error: insertError } = await supabaseService
          .from("video_assignments")
          .insert({
            title,
            module: moduleName,
            description,
            due_date: dueDateStr,
            class_name: className,
            campus: "International"
          })
          .select()
          .single();
        
        if (insertError) {
          console.error(`Error creating assignment for ${className}:`, insertError);
          results.push({ className, status: "error", error: insertError.message });
        } else {
          results.push({ className, status: "created", id: inserted.id });
        }
      } else {
        results.push({ className, status: "skipped", reason: "already exists" });
      }
    }

    return NextResponse.json({ 
      success: true, 
      week: weekNum,
      dueDate: dueDateStr,
      results 
    });

  } catch (err: any) {
    console.error("Cron job error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
