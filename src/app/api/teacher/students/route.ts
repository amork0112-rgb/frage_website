import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

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
    const role = user.app_metadata?.role ?? "parent";
    if (role !== "teacher" && role !== "admin" && role !== "master_admin") {
      return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 403 });
    }

    const { data, error } = await supabaseService
      .from("v_students_full")
      .select(`
        id,
        student_name,
        english_first_name,
        birth_date,
        parent_phone,
        campus,
        status,
        class_name
      `)
      .order("student_name", { ascending: true });

    console.log("RAW DATA", data?.[0]);

    if (error) {
      console.error("TEACHER/STUDENTS SELECT ERROR:", error);
      return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 500 });
    }
    
    const base = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.student_name ?? "",
      englishName: r.english_first_name ?? "",
      birthDate: r.birth_date ?? "",
      phone: r.parent_phone ?? "",
      className: r.class_name ?? "",
      campus: r.campus ?? "",
      status: (r.status as Status) ?? "waiting",
      pickupType: r.pickup_type ?? "self",
      dropoffType: r.dropoff_type ?? "self",
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

