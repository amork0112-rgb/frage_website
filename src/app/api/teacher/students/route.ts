import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

type Status = "waiting" | "consultation_reserved" | "consult_done" | "approved" | "promoted" | "rejected" | "hold";

type Student = {
  id: string;
  childId?: string;
  name: string;
  englishName: string;
  birthDate: string;
  phone: string;
  className: string;
  campus: string;
  status: Status;
  parentName: string;
  parentAccountId: string;
  address: string;
  bus: string;
  departureTime: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  pickupType?: "bus" | "self";
  dropoffType?: "bus" | "self";
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const pageSize = Math.max(parseInt(url.searchParams.get("pageSize") || "200", 10), 1);
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 401 });
    
    const role = await resolveUserRole(user);
    if (role !== "teacher" && role !== "admin" && role !== "master_teacher" && role !== "master_admin") {
      return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 403 });
    }

    const { data, error } = await supabaseService
      .from("v_students_full")
      .select(`
        student_id,
        student_name,
        english_first_name,
        birth_date,
        parent_phone,
        class_name,
        campus,
        status,
        parent_name,
        parent_user_id,
        address,
        bus,
        departure_time,
        pickup_lat,
        pickup_lng,
        dropoff_lat,
        dropoff_lng,
        pickup_type,
        dropoff_type
      `)
      .order("student_name", { ascending: true });
    if (error) {
      console.error("TEACHER/STUDENTS SELECT ERROR:", error);
      return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 500 });
    }
    const rows = Array.isArray(data) ? data : [];
    const base: Student[] = rows.map((r: any) => ({
      id: String(r.student_id ?? ""),
      childId: r.child_id ?? undefined,
      name: String(r.student_name ?? ""),
      englishName: String(r.english_first_name ?? ""),
      birthDate: String(r.birth_date ?? ""),
      phone: String(r.parent_phone ?? ""),
      className: String(r.class_name ?? "미배정"),
      campus: String(r.campus ?? "미지정"),
      status: (String(r.status ?? "promoted") as Status),
      parentName: String(r.parent_name ?? ""),
      parentAccountId: String(r.parent_user_id ?? ""),
      address: String(r.address ?? ""),
      bus: String(r.bus ?? ""),
      departureTime: String(r.departure_time ?? ""),
      pickupLat: typeof r.pickup_lat === "number" ? r.pickup_lat : undefined,
      pickupLng: typeof r.pickup_lng === "number" ? r.pickup_lng : undefined,
      dropoffLat: typeof r.dropoff_lat === "number" ? r.dropoff_lat : undefined,
      dropoffLng: typeof r.dropoff_lng === "number" ? r.dropoff_lng : undefined,
      pickupType: (r.pickup_type as any) ?? "self",
      dropoffType: (r.dropoff_type as any) ?? "self",
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

