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

    // 2. Fetch Classes (from classes table)
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, name, campus")
      .order("name", { ascending: true });

    if (classError) throw classError;

    const availableClasses = (classData || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      campus: c.campus
    }));

    // Format for frontend
    // We provide all classes as both regular and program classes for now
    const regularClasses = availableClasses;
    const programClasses = availableClasses.map(c => ({ ...c, program_name: c.name }));

    // Compatibility return structure
    return NextResponse.json({
      campuses,
      classes: availableClasses,
      regularClasses,
      programClasses,
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
