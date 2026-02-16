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
    console.log("Incoming PATCH body for students onboarding:", body);
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
      // updated_at: new Date().toISOString(), // This column does not exist in students table
    };

    if (body.use_bus !== undefined) {
      payload.use_bus = body.use_bus;
      // Also update pickup/dropoff types based on use_bus (These columns do not exist in students table)
      // payload.pickup_type = body.use_bus ? "bus" : "self";
      // payload.dropoff_type = body.use_bus ? "bus" : "self";
    }

    // if (body.commute_type !== undefined) {
    //   payload.commute_type = body.commute_type;
    // }

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

    // Check which table to update
    const { data: enrolledStudent } = await supabaseService
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();

    if (enrolledStudent) {
      // Update students table
      console.log("Final PATCH payload for students table (enrolledStudent):", payload);
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
