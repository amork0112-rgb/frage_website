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
  const campusParam = url.searchParams.get("campus");
  const classIdParam = url.searchParams.get("classId");

  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 401 });
    
    const role = await resolveUserRole(user);
    if (role !== "teacher" && role !== "admin" && role !== "master_teacher" && role !== "master_admin") {
      return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 403 });
    }

    let query = supabaseService
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
        parent_auth_user_id,
        address,
        use_bus,
        pickup_lat,
        pickup_lng,
        dropoff_lat,
        dropoff_lng
      `, { count: "exact" });

    // Filter by Campus
    if (campusParam && campusParam !== "All") {
      let dbCampus = campusParam;
      if (campusParam === "International") dbCampus = "국제관";
      else if (campusParam === "Andover") dbCampus = "앤도버관";
      else if (campusParam === "Atheneum") dbCampus = "아테네움관";
      else if (campusParam === "Platz") dbCampus = "플라츠관";
      query = query.eq("campus", dbCampus);
    }

    // Filter by Class Name (passed as classId param)
    if (classIdParam && classIdParam !== "All" && classIdParam !== "-") {
      query = query.eq("class_name", classIdParam);
    }

    const { data, error, count } = await query
      .order("student_name", { ascending: true })
      .range((page - 1) * pageSize, (page - 1) * pageSize + pageSize - 1);

    if (error) {
      console.error("TEACHER/STUDENTS SELECT ERROR:", error);
      return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 500 });
    }
    const rows = Array.isArray(data) ? data : [];
    const normalizeCampus = (c: string) => {
      if (!c) return "Unspecified";
      if (c.includes("국제")) return "International";
      if (c.includes("앤도버")) return "Andover";
      if (c.includes("아테네움")) return "Atheneum";
      if (c.includes("플라츠")) return "Platz";
      return c;
    };
    const base: Student[] = rows.map((r: any) => ({
      id: String(r.student_id ?? ""),
      childId: r.child_id ?? undefined,
      name: String(r.student_name ?? ""),
      englishName: String(r.english_first_name ?? ""),
      birthDate: String(r.birth_date ?? ""),
      phone: String(r.parent_phone ?? ""),
      className: String(r.class_name ?? "Unassigned"),
      campus: normalizeCampus(String(r.campus ?? "")),
      status: (String(r.status ?? "promoted") as Status),
      parentName: String(r.parent_name ?? ""),
      parentAccountId: String(r.parent_auth_user_id ?? ""),
      address: String(r.address ?? ""),
      bus: String(r.use_bus ?? ""),
      departureTime: "",
      pickupLat: typeof r.pickup_lat === "number" ? r.pickup_lat : undefined,
      pickupLng: typeof r.pickup_lng === "number" ? r.pickup_lng : undefined,
      dropoffLat: typeof r.dropoff_lat === "number" ? r.dropoff_lat : undefined,
      dropoffLng: typeof r.dropoff_lng === "number" ? r.dropoff_lng : undefined,
      pickupType: "self",
      dropoffType: "self",
    }));
    const total = count ?? base.length;
    return NextResponse.json({ items: base, total, page, pageSize }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 500 });
  }
}

