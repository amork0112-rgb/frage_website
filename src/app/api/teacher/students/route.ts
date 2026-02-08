//app/api/teacher/students/route.ts
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
  const campusParam = url.searchParams.get("campus");
  const classIdParam = url.searchParams.get("classId");

  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 401 });
    
    // 1. Teacher Check
    const { data: teacher, error: teacherError } = await supabaseService
      .from("teachers")
      .select("id, role, campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (teacherError) {
      console.error("❌ teachers query failed", teacherError);
      return NextResponse.json({ items: [], total: 0, page, pageSize, error: "Teacher query error" }, { status: 500 });
    }

    if (!teacher) {
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
    // master_teacher can see all if they want, but default to their campus if not "All"
    // regular teacher restricted to their campus
    if (teacher.role !== "master_teacher") {
      // Force campus filter for regular teachers
      const { data: campusClasses } = await supabaseService
        .from("classes")
        .select("id")
        .eq("campus", teacher.campus);
      
      const validClassIds = campusClasses?.map((c: any) => c.id) || [];
      if (validClassIds.length > 0) {
        query = query.in("main_class", validClassIds);
      } else {
        query = query.in("main_class", []);
      }
    } else {
      // Master Teacher
      if (campusParam && campusParam !== "All") {
        const { data: campusClasses } = await supabaseService
          .from("classes")
          .select("id")
          .eq("campus", campusParam);
  
        const validClassIds = campusClasses?.map((c: any) => c.id) || [];
        
        if (validClassIds.length > 0) {
          query = query.in("main_class", validClassIds);
        } else {
          query = query.in("main_class", []);
        }
      }
    }

    // Filter by Class (ID)
    if (classIdParam && classIdParam !== "All" && classIdParam !== "-") {
      query = query.eq("main_class", classIdParam);
    }

    const { data, error, count } = await query
      .order("student_name", { ascending: true })
      .range((page - 1) * pageSize, (page - 1) * pageSize + pageSize - 1);

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
      className: String(r.class_name ?? "Unassigned"),
      campus: String(r.campus ?? ""),
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

