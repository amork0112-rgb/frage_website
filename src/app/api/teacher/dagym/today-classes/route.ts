import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const campusParam = searchParams.get("campus");

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Teacher Check (Source of Truth)
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

    // 3. Calculate Weekday
    const weekday = new Date(date)
      .toLocaleDateString("en-US", { weekday: "short" })
      .toLowerCase(); // mon, tue, wed...

    // 4. Query Schedules + Classes
    let query = supabaseService
      .from("class_schedules")
      .select(`
        class_id,
        weekdays,
        classes!inner (
          id,
          name,
          campus,
          sort_order,
          active
        )
      `)
      .ilike("weekdays", `%${weekday}%`)
      .eq("classes.active", true)
      .order("sort_order", { foreignTable: "classes" });

    // Apply Campus Filter
    if (teacher.role !== "master_teacher") {
      // Regular teachers see only their campus
      query = query.eq("classes.campus", teacher.campus);
    } else {
      // Master teachers see All or filtered
      if (campusParam && campusParam !== "All") {
        query = query.eq("classes.campus", campusParam);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Today classes query failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform response to match 'classes' shape expected by frontend
    const formattedClasses = data.map((item: any) => ({
      id: item.classes.id,
      name: item.classes.name,
      campus: item.classes.campus,
      sort_order: item.classes.sort_order,
      weekdays: item.weekdays
    }));

    return NextResponse.json(formattedClasses);

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
