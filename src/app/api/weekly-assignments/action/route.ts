import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { campus, className, weekKey, action, confirmedDueDate, reason } = body;

    if (!campus || !className || !weekKey || !action) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const updateData: any = {
      campus,
      class_name: className,
      week_key: weekKey,
      updated_at: new Date().toISOString(),
    };

    // Map action to status and fields
    if (action === "publish") {
      updateData.status = "published";
    } else if (action === "skip") {
      updateData.status = "skipped";
      updateData.reason = "Skipped by teacher";
    } else if (action === "set_due_date") {
      updateData.status = "scheduled";
      updateData.confirmed_due_date = confirmedDueDate;
    } else {
      return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    // Use upsert assuming unique constraint on (campus, week_key, class_name)
    // If conflict, update the specified columns
    const { data, error } = await supabase
      .from("weekly_class_assignments")
      .upsert(updateData, { onConflict: "campus,week_key,class_name" })
      .select()
      .single();

    if (error) {
      console.error("Error upserting weekly assignment:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
