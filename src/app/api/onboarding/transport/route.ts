import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { isValidUUID } from "@/lib/uuid";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const role = await resolveUserRole(user);
    if (role !== "parent") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const studentIdRaw = body?.studentId;
    const studentId = typeof studentIdRaw === "string" ? studentIdRaw : String(studentIdRaw || "");
    const pickupMethodRaw = String(body?.pickup_method || "").trim();
    const dropoffMethodRaw = String(body?.dropoff_method || "").trim();
    const pickupAddressRaw = body?.pickup_address;
    const dropoffAddressRaw = body?.dropoff_address;
    const defaultDropoffTimeRaw = String(body?.default_dropoff_time || "").trim();

    console.log("onboarding_transport_request", {
      userId: user.id,
      role,
      studentId,
      pickupMethod: pickupMethodRaw,
      dropoffMethod: dropoffMethodRaw,
      hasPickupAddress: typeof pickupAddressRaw === "string" && pickupAddressRaw.trim().length > 0,
      hasDropoffAddress: typeof dropoffAddressRaw === "string" && dropoffAddressRaw.trim().length > 0,
      defaultDropoffTimeRaw,
    });

    if (!studentId) {
      return NextResponse.json({ ok: false, error: "student_id_required" }, { status: 400 });
    }

    if (!isValidUUID(studentId)) {
      return NextResponse.json({ ok: false, error: "invalid_student_id" }, { status: 400 });
    }

    const allowedMethods = ["shuttle", "academy", "self"];
    if (!pickupMethodRaw || !allowedMethods.includes(pickupMethodRaw)) {
      return NextResponse.json({ ok: false, error: "invalid_pickup_method" }, { status: 400 });
    }
    if (!dropoffMethodRaw || !allowedMethods.includes(dropoffMethodRaw)) {
      return NextResponse.json({ ok: false, error: "invalid_dropoff_method" }, { status: 400 });
    }

    if (defaultDropoffTimeRaw && !/^\d{2}:\d{2}$/.test(defaultDropoffTimeRaw)) {
      return NextResponse.json({ ok: false, error: "invalid_time_format" }, { status: 400 });
    }

    const parseNumber = (v: unknown) => {
      if (typeof v === "number") return v;
      if (v == null) return null;
      const n = Number.parseFloat(String(v));
      return Number.isNaN(n) ? null : n;
    };

    const pickupLat = parseNumber(body?.pickup_lat);
    const pickupLng = parseNumber(body?.pickup_lng);
    const dropoffLat = parseNumber(body?.dropoff_lat);
    const dropoffLng = parseNumber(body?.dropoff_lng);

    const pickupAddress =
      typeof pickupAddressRaw === "string" && pickupAddressRaw.trim().length > 0
        ? pickupAddressRaw.trim()
        : null;
    const dropoffAddress =
      typeof dropoffAddressRaw === "string" && dropoffAddressRaw.trim().length > 0
        ? dropoffAddressRaw.trim()
        : null;

    const { data: parent } = await supabaseService
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!parent?.id) {
      return NextResponse.json({ ok: false, error: "parent_not_found" }, { status: 400 });
    }

    const parentId = String(parent.id);

    const { data: student } = await supabaseService
      .from("students")
      .select("id,parent_id,profile_completed")
      .eq("id", studentId)
      .maybeSingle();

    if (!student || String(student.parent_id) !== parentId) {
      return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 404 });
    }

    if (student.profile_completed) {
      return NextResponse.json(
        { ok: false, error: "already_enrolled" },
        { status: 400 }
      );
    }

    const useBus = pickupMethodRaw === "shuttle" || dropoffMethodRaw === "shuttle";
    const primaryAddress = dropoffAddress || pickupAddress || null;

    const normalizedDropoffTime =
      defaultDropoffTimeRaw.length === 5
        ? `${defaultDropoffTimeRaw}:00`
        : defaultDropoffTimeRaw || null;

    const updatePayload: Record<string, any> = {
      pickup_method: pickupMethodRaw,
      dropoff_method: dropoffMethodRaw,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      pickup_address: pickupAddress,
      dropoff_lat: dropoffLat,
      dropoff_lng: dropoffLng,
      dropoff_address: dropoffAddress,
      default_dropoff_time: normalizedDropoffTime,
      onboarding_step: "complete",
      use_bus: useBus,
      address: primaryAddress,
      profile_completed: true,
    };

    console.log("onboarding_transport_update_payload", {
      studentId,
      parentId,
      pickup_method: updatePayload.pickup_method,
      dropoff_method: updatePayload.dropoff_method,
      hasPickupLat: typeof updatePayload.pickup_lat === "number",
      hasPickupLng: typeof updatePayload.pickup_lng === "number",
      hasDropoffLat: typeof updatePayload.dropoff_lat === "number",
      hasDropoffLng: typeof updatePayload.dropoff_lng === "number",
      hasPickupAddress: !!updatePayload.pickup_address,
      hasDropoffAddress: !!updatePayload.dropoff_address,
      default_dropoff_time: updatePayload.default_dropoff_time,
      use_bus: updatePayload.use_bus,
    });

    const { error: updateErr } = await supabaseService
      .from("students")
      .update(updatePayload)
      .eq("id", studentId)
      .eq("parent_id", parentId);

    if (updateErr) {
      console.error("onboarding_transport_update_error", updateErr);
      return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("onboarding_transport_server_error", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
