import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function PATCH(
  req: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params;
    const body = await req.json();
    const supabase = createSupabaseServer();

    // Verify user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Prepare update payload
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.use_bus !== undefined) {
      payload.use_bus = body.use_bus;
      // Also update pickup/dropoff types based on use_bus
      payload.pickup_type = body.use_bus ? "bus" : "self";
      payload.dropoff_type = body.use_bus ? "bus" : "self";
    }

    if (body.commute_type !== undefined) {
      payload.commute_type = body.commute_type;
    }

    if (body.address !== undefined) {
      payload.address = body.address;
    }

    if (body.pickup_place !== undefined) {
      payload.pickup_address = body.pickup_place;
    }

    if (body.dropoff_place !== undefined) {
      payload.dropoff_address = body.dropoff_place;
    }

    if (body.parent_auth_user_id !== undefined) {
      payload.parent_auth_user_id = body.parent_auth_user_id;
    }

    if (body.profile_completed !== undefined) {
      payload.profile_completed = body.profile_completed;
    }

    // Update students table
    const { error } = await supabaseService
      .from("students")
      .update(payload)
      .eq("id", studentId);

    if (error) {
      console.error("Onboarding update error:", error);
      return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Onboarding server error:", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
