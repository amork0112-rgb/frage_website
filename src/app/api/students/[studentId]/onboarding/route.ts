import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role !== "parent") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const studentId = String(params.studentId || "");
    if (!studentId) {
      return NextResponse.json({ error: "missing_student_id" }, { status: 400 });
    }

    const body = await request.json();

    const use_bus =
      typeof body.use_bus === "boolean" ? body.use_bus : null;
    const commute_type =
      typeof body.commute_type === "string" ? String(body.commute_type) : null;
    const address =
      typeof body.address === "string" ? String(body.address) : null;
    const profile_completed =
      body.profile_completed === true ? true : null;

    const parent_auth_user_id =
      typeof body.parent_auth_user_id === "string" && body.parent_auth_user_id
        ? String(body.parent_auth_user_id)
        : user.id;

    const payload: Record<string, any> = {};

    if (use_bus !== null) {
      payload.use_bus = use_bus;
    }

    if (commute_type === "bus" || commute_type === "self") {
      payload.pickup_type = commute_type;
      payload.dropoff_type = commute_type;
    }

    if (typeof address === "string") {
      payload.address = address;
    }

    if (profile_completed === true) {
      payload.profile_completed = true;
    }

    payload.parent_auth_user_id = parent_auth_user_id;

    const { error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", studentId);

    if (error) {
      return NextResponse.json(
        { error: "update_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

