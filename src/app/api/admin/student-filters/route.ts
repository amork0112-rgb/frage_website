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

    // 1. Fetch Classes (for classes list and campuses)
    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("id, name, campus, class_type, program_name, active")
      .order("name", { ascending: true });

    if (classesError) throw classesError;

    // 2. Fetch Buses
    const { data: busesData, error: busesError } = await supabase
      .from("buses")
      .select("id, name")
      .order("name", { ascending: true });

    if (busesError) throw busesError;

    // 3. Fetch TimeSlots (from class_schedules)
    // Using class_end_time because the UI filter is for "Departure Time" (하원 시간대)
    const { data: schedulesData, error: schedulesError } = await supabase
      .from("class_schedules")
      .select("class_end_time");

    if (schedulesError) throw schedulesError;

    // Process Data
    const classesRaw = classesData || [];
    const busesRaw = busesData || [];
    const schedulesRaw = schedulesData || [];

    // Extract Campuses (from all classes, active or not?)
    // Usually filters should show what's possible.
    const campusSet = new Set<string>();
    classesRaw.forEach((c) => {
      if (c.campus) campusSet.add(c.campus);
    });
    const campuses = Array.from(campusSet).sort();

    // Regular Classes (Active) for Dropdowns
    const regularClasses = classesRaw
      .filter((c) => c.class_type === "regular" && c.active)
      .map((c) => ({
        id: String(c.id),
        name: String(c.name || ""),
      }));

    // Program Classes (Active) for Dropdowns
    const programClasses = classesRaw
      .filter((c) => c.class_type === "program" && c.active)
      .map((c) => ({
        id: String(c.id),
        name: String(c.name || ""),
        program_name: String(c.program_name || ""),
      }));

    // Program Names for Filter
    const programNames = Array.from(
      new Set(programClasses.map((p) => p.program_name).filter(Boolean))
    ).sort();

    // All Classes (for backward compatibility or general list)
    // We'll keep the existing 'classes' field but mapped to regular classes for now, 
    // as the main 'Class' filter usually targets the main class.
    // However, the frontend might rely on this for mapping IDs to names.
    const classes = regularClasses;

    // Format Buses
    const buses = busesRaw.map((b) => ({
      id: String(b.id),
      name: String(b.name || ""),
    }));

    // Extract TimeSlots
    const timeSet = new Set<string>();
    schedulesRaw.forEach((s) => {
      if (s.class_end_time) {
        // Format to HH:mm
        const time = String(s.class_end_time).slice(0, 5);
        timeSet.add(time);
      }
    });
    const timeSlots = Array.from(timeSet).sort();

    return NextResponse.json({
      campuses,
      classes, // Keeping this for existing frontend compatibility
      regularClasses,
      programClasses,
      programNames,
      buses,
      timeSlots,
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
