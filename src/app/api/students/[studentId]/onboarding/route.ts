//app/api/students/[studentsID]/onboarding
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
    // Clean up body from fields not intended for direct update on students table
    delete body.onboarding_step;
    delete body.commute_type; // Ensure this is also removed if it somehow makes its way here

    const supabase = createSupabaseServer();

    // Verify user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Prepare update payload
    const payload: any = {};

    if (body.use_bus !== undefined) {
      payload.use_bus = body.use_bus;
    }

    if (body.pickup_type !== undefined) {
      payload.pickup_method = body.pickup_type;
    }

    if (body.dropoff_type !== undefined) {
      payload.dropoff_method = body.dropoff_type;
    }

    if (body.address !== undefined) {
      payload.address = body.address;
    }

    if (body.pickup_address !== undefined) {
      payload.pickup_address = body.pickup_address;
    }

    if (body.dropoff_address !== undefined) {
      payload.dropoff_address = body.dropoff_address;
    }

    if (body.parent_auth_user_id !== undefined) {
      payload.parent_auth_user_id = body.parent_auth_user_id;
    }

    if (body.profile_completed !== undefined) {
      payload.profile_completed = body.profile_completed;
    }

    if (body.pickup_latitude !== undefined) {
      payload.pickup_latitude = body.pickup_latitude;
    }

    if (body.pickup_longitude !== undefined) {
      payload.pickup_longitude = body.pickup_longitude;
    }

    if (body.dropoff_latitude !== undefined) {
      payload.dropoff_latitude = body.dropoff_latitude;
    }

    if (body.dropoff_longitude !== undefined) {
      payload.dropoff_longitude = body.dropoff_longitude;
    }

    // Check which table to update
    const { data: enrolledStudent } = await supabaseService
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();

    if (enrolledStudent) {
      // Update students table

      const { error } = await supabaseService
        .from("students")
        .update(payload)
        .eq("id", studentId);

      if (error) {
        console.error("Onboarding update error (students):", error);
        return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
      }
    } else {
      // Check new_students table
      const { data: newStudent } = await supabaseService
        .from("new_students")
        .select("id, address, use_bus")
        .eq("id", studentId)
        .maybeSingle();

      if (newStudent) {
        // Map payload for new_students table
        const newPayload: any = {
          updated_at: payload.updated_at,
        };
        
        if (payload.address !== undefined) newPayload.address = payload.address;
        if (payload.use_bus !== undefined) newPayload.use_bus = payload.use_bus;
        if (payload.parent_auth_user_id !== undefined) newPayload.parent_auth_user_id = payload.parent_auth_user_id;
        if (payload.pickup_latitude !== undefined) newPayload.pickup_latitude = payload.pickup_latitude;
        if (payload.pickup_longitude !== undefined) newPayload.pickup_longitude = payload.pickup_longitude;
        if (payload.dropoff_latitude !== undefined) newPayload.dropoff_latitude = payload.dropoff_latitude;
        if (payload.dropoff_longitude !== undefined) newPayload.dropoff_longitude = payload.dropoff_longitude;
        if (payload.pickup_address !== undefined) newPayload.pickup_address = payload.pickup_address;
        if (payload.dropoff_address !== undefined) newPayload.dropoff_address = payload.dropoff_address;

        const { error } = await supabaseService
          .from("new_students")
          .update(newPayload)
          .eq("id", studentId);

        if (error) {
          console.error("Onboarding update error (new_students):", error);
          return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
        }
      } else {
        return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 404 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Onboarding server error:", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
