export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServer();

    const { data: user } = await supabase.auth.getUser();
    if (!user || !user.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 1. Fetch Campuses (from v_students_full)
    const { data: campusData, error: campusError } = await supabase
      .from("v_students_full")
      .select("campus");
    
    if (campusError) throw campusError;

    const campusSet = new Set<string>();
    (campusData || []).forEach((r: any) => {
      if (r.campus) campusSet.add(r.campus);
    });
    const campuses = Array.from(campusSet).sort();

    // 2. Fetch Classes (from v_students_full where main_class is not null)
    const { data: classData, error: classError } = await supabase
      .from("v_students_full")
      .select("main_class, class_name")
      .not("main_class", "is", null);

    if (classError) throw classError;

    const classMap = new Map<string, string>();
    (classData || []).forEach((r: any) => {
      if (r.main_class) {
        classMap.set(r.main_class, r.class_name || r.main_class);
      }
    });

    // Format for frontend
    const availableClasses = Array.from(classMap.entries()).map(([id, name]) => ({
      id,
      name
    })).sort((a, b) => a.name.localeCompare(b.name));

    // Compatibility return structure
    return NextResponse.json({
      campuses,
      classes: availableClasses,
      regularClasses: availableClasses, // Mapping same for simplicity as requested
      programClasses: [],
      programNames: [],
      buses: [], // Not requested to fix but keeping structure
      timeSlots: [],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        campuses: [],
        classes: [],
        regularClasses: [],
        programClasses: [],
        programNames: [],
        buses: [],
        timeSlots: [],
      },
      { status: 500 }
    );
  }
}
