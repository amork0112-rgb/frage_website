export const dynamic = "force-dynamic";
// src/app/api/admin/students/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

type Status = "waiting" | "consultation_reserved" | "consult_done" | "approved" | "promoted" | "rejected" | "hold";

type Student = {
  id: string;
  student_name: string;
  campus: string;
  status: Status;
  address: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  parent_auth_user_id?: string | null;
  source_new_student_id?: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campus = url.searchParams.get("campus");
  const classId = url.searchParams.get("classId");
  const dajim = url.searchParams.get("dajim");
  const name = url.searchParams.get("name");

  try {
    let query = supabaseService
      .from("v_students_full")
      .select("*");

    if (campus && campus !== "All") {
      query = query.eq("campus", campus);
    }

    if (classId && classId !== "All") {
      query = query.eq("main_class", classId);
    }

    if (dajim && dajim !== "All") {
      query = query.eq("dajim_enabled", dajim === "O");
    }

    if (name) {
      query = query.ilike("student_name", `%${name}%`);
    }

    const { data, error } = await query.order("student_name", { ascending: true });

    if (error) {
      console.error(error);
      return NextResponse.json({ items: [], total: 0 }, { status: 500 });
    }
    const rows = Array.isArray(data) ? data : [];
    const items: any[] = rows.map((r: any) => ({
      id: String(r.id ?? ""),
      student_name: String(r.student_name ?? ""),
      campus: String(r.campus ?? ""),
      // status: (String(r.status ?? "promoted") as Status), // Removed as requested for UI
      birth_date: String(r.birth_date ?? ""),
      main_class: String(r.main_class ?? ""),
      class_name: String(r.class_name ?? ""),
      parent_phone: String(r.parent_phone ?? ""),
      parent_name: String(r.parent_name ?? ""),
      dajim_enabled: !!r.dajim_enabled,
      has_transport: !!r.bus, // Infer transport from bus field existence
      created_at: String(r.created_at ?? ""),
    }));
    
    return NextResponse.json({ items, total: items.length }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const source = String(body?.source || "");
    const items: any[] = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ ok: false, inserted: 0 }, { status: 400 });
    }
    if (source === "csv") {
      const payload = items.map((s) => ({
        student_name: String(s.student_name ?? s.name ?? ""),
        campus: String(s.campus ?? ""),
        status: String(s.status ?? "재원"),
        address: String(s.address ?? ""),
        pickup_lat: typeof s.pickup_lat === "number" ? s.pickup_lat : null,
        pickup_lng: typeof s.pickup_lng === "number" ? s.pickup_lng : null,
        dropoff_lat: typeof s.dropoff_lat === "number" ? s.dropoff_lat : null,
        dropoff_lng: typeof s.dropoff_lng === "number" ? s.dropoff_lng : null,
        dajim_enabled: typeof s.dajim_enabled === "boolean" ? s.dajim_enabled : false,
        parent_auth_user_id: s.parent_auth_user_id ?? null,
        source_new_student_id: s.source_new_student_id ?? null,
      }));
      const { data, error } = await supabaseService.rpc("admin_import_students_csv", {
        items: payload,
      });
      if (error) {
        console.error(error);
        return NextResponse.json({ ok: false, inserted: 0 }, { status: 500 });
      }
      const inserted = Array.isArray(data?.inserted_ids) ? data.inserted_ids.length : items.length;
      return NextResponse.json({ ok: true, inserted }, { status: 200 });
    }
    let inserted = 0;
    for (const s of items) {
      const { error } = await supabaseService.from("students").insert({
        id: s.id ?? undefined,
        student_name: String(s.student_name ?? s.name ?? ""),
        campus: String(s.campus ?? ""),
        status: String(s.status ?? "재원"),
        address: String(s.address ?? ""),
        pickup_lat: typeof s.pickup_lat === "number" ? s.pickup_lat : null,
        pickup_lng: typeof s.pickup_lng === "number" ? s.pickup_lng : null,
        dropoff_lat: typeof s.dropoff_lat === "number" ? s.dropoff_lat : null,
        dropoff_lng: typeof s.dropoff_lng === "number" ? s.dropoff_lng : null,
        dajim_enabled: typeof s.dajim_enabled === "boolean" ? s.dajim_enabled : false,
        parent_auth_user_id: s.parent_auth_user_id ?? null,
        source_new_student_id: s.source_new_student_id ?? null,
      });
      if (error) {
        console.error(error);
        return NextResponse.json({ ok: false, inserted }, { status: 500 });
      }
      inserted++;
    }
    return NextResponse.json({ ok: true, inserted }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, inserted: 0 }, { status: 500 });
  }
}
