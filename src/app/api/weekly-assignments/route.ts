import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const campus = searchParams.get("campus");
    const week = searchParams.get("week");

    if (!campus || !week) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameters: campus, week" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("weekly_class_assignments")
      .select("*")
      .eq("campus", campus)
      .eq("week_key", week);

    if (error) {
      console.error("Error fetching weekly assignments:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Map snake_case DB columns to camelCase frontend expected format
    const mappedData = (data || []).map((item: any) => ({
      className: item.class_name,
      campus: item.campus,
      weekKey: item.week_key,
      status: item.status,
      suggestedDueDate: item.suggested_due_date,
      confirmedDueDate: item.confirmed_due_date,
      reason: item.reason,
    }));

    return NextResponse.json(mappedData, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
