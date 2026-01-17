import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const role = (user.app_metadata as any)?.role ?? "parent";
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

    if (!studentId) {
      return NextResponse.json({ ok: false, error: "student_id_required" }, { status: 400 });
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
      .select("id,parent_id")
      .eq("id", studentId)
      .maybeSingle();

    if (!student || String(student.parent_id) !== parentId) {
      return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 404 });
    }

    const useBus = pickupMethodRaw === "shuttle" || dropoffMethodRaw === "shuttle";
    const primaryAddress = dropoffAddress || pickupAddress || null;

    const updatePayload: Record<string, any> = {
      pickup_method: pickupMethodRaw,
      dropoff_method: dropoffMethodRaw,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      pickup_address: pickupAddress,
      dropoff_lat: dropoffLat,
      dropoff_lng: dropoffLng,
      dropoff_address: dropoffAddress,
      default_dropoff_time: defaultDropoffTimeRaw || null,
      onboarding_step: "complete",
      use_bus: useBus,
      address: primaryAddress,
      profile_completed: true,
    };

    const { error: updateErr } = await supabaseService
      .from("students")
      .update(updatePayload)
      .eq("id", studentId)
      .eq("parent_id", parentId);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

