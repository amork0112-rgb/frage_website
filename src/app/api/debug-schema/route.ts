
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check teacher_reports columns by selecting one row
    const { data: reports, error: reportError } = await supabaseService
      .from("teacher_reports")
      .select("*")
      .limit(1);

    // Check v_students_full columns by selecting one row
    const { data: students, error: studentError } = await supabaseService
      .from("v_students_full")
      .select("*")
      .limit(1);

    return NextResponse.json({
      reports: { data: reports, error: reportError },
      students: { data: students, error: studentError }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
