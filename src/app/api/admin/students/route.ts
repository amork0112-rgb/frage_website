// src/app/api/admin/students/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

type Status = "재원" | "휴원" | "퇴원";

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
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const pageSize = Math.max(parseInt(url.searchParams.get("pageSize") || "200", 10), 1);
  try {
    const { data, error } = await supabaseService
      .from("students")
      .select(`
        id,
        student_name,
        campus,
        status,
        address,
        pickup_lat,
        pickup_lng,
        dropoff_lat,
        dropoff_lng,
        parent_auth_user_id,
        source_new_student_id,
        created_at
      `)
      .order("student_name", { ascending: true });
    if (error) {
      console.error(error);
      return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 500 });
    }
    const rows = Array.isArray(data) ? data : [];
    const base: Student[] = rows.map((r: any) => ({
      id: String(r.id ?? ""),
      student_name: String(r.student_name ?? ""),
      campus: String(r.campus ?? ""),
      status: (String(r.status ?? "재원") as Status),
      address: String(r.address ?? ""),
      pickup_lat: r.pickup_lat ?? null,
      pickup_lng: r.pickup_lng ?? null,
      dropoff_lat: r.dropoff_lat ?? null,
      dropoff_lng: r.dropoff_lng ?? null,
      parent_auth_user_id: r.parent_auth_user_id ?? null,
      source_new_student_id: r.source_new_student_id ?? null,
      created_at: String(r.created_at ?? ""),
    }));
    const total = base.length;
    const start = (page - 1) * pageSize;
    const items = base.slice(start, start + pageSize);
    return NextResponse.json({ items, total, page, pageSize }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 500 });
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
