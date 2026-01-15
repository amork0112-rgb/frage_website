import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

type Status = "waiting" | "consultation_reserved" | "consult_done" | "approved" | "promoted" | "rejected" | "hold";

type StudentRow = {
  student_id: string;
  student_name: string;
  english_first_name: string | null;
  birth_date: string | null;
  campus: string | null;
  status: Status;
  class_name: string | null;
  class_id: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_auth_user_id: string | null;
  address: string | null;
  bus: string | null;
  departure_time: string | null;
  main_class?: string | null;
  pickup_type?: "bus" | "self" | null;
  dropoff_type?: "bus" | "self" | null;
};

type Student = {
  id: string;
  childId?: string;
  name: string;
  englishName: string;
  classId?: string;
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
  const classId = url.searchParams.get("classId");
  const campus = url.searchParams.get("campus");
  try {
    const supabaseAuth = createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role;
    console.log("TEACHER_STUDENTS_PARAMS", {
      role,
      classId,
      campus,
    });

    const normalizedClassId = classId?.trim();
    const normalizedCampus = campus?.trim();

    // 1. Master/Admin roles -> View all students
    if (["master_teacher", "admin", "master_admin"].includes(role)) {
      let query = supabaseService
        .from("v_students_full")
        .select(`
        student_id,
        student_name,
        english_first_name,
        birth_date,
        parent_name,
        parent_phone,
        parent_auth_user_id,
        address,
        bus,
        departure_time,
        campus,
        status,
        class_name,
        class_id,
        main_class,
        pickup_type,
        dropoff_type
      `);

      if (
        normalizedClassId &&
        normalizedClassId !== "All" &&
        normalizedClassId !== "all" &&
        normalizedClassId !== "-" &&
        normalizedClassId !== "undefined" &&
        normalizedClassId !== "null"
      ) {
        query = query.eq("main_class", normalizedClassId);
      }

      if (
        normalizedCampus &&
        normalizedCampus !== "All" &&
        normalizedCampus !== "all" &&
        normalizedCampus !== "-"
      ) {
        query = query.eq("campus", normalizedCampus);
      }

      const { data, error } = await query.order("student_name", { ascending: true });
      
      if (error) {
        console.error("STUDENTS SELECT ERROR", error);
        return NextResponse.json({ error }, { status: 500 });
      }

      const rows = (data ?? []) as StudentRow[];
      return formatResponse(rows, page, pageSize);
    }

    // 2. Regular Teacher -> View only assigned classes (or all if none assigned)
    if (role === "teacher") {
      const { data: teacherClasses } = await supabaseService
        .from("teacher_classes")
        .select("class_name")
        .eq("teacher_id", user.id);

      const hasClasses = !!teacherClasses && teacherClasses.length > 0;
      const classNames = hasClasses ? teacherClasses.map((c: any) => c.class_name) : [];

      let query = supabaseService
        .from("v_students_full")
        .select(`
          student_id,
          student_name,
          english_first_name,
          birth_date,
          parent_name,
          parent_phone,
          parent_auth_user_id,
          address,
          bus,
          departure_time,
          campus,
          status,
          class_name,
          class_id,
          main_class,
          pickup_type,
          dropoff_type
        `);

      if (hasClasses) {
        query = query.in("class_name", classNames);
      }

      if (
        normalizedClassId &&
        normalizedClassId !== "All" &&
        normalizedClassId !== "all" &&
        normalizedClassId !== "-"
      ) {
        query = query.eq("main_class", normalizedClassId);
      }

      if (
        normalizedCampus &&
        normalizedCampus !== "All" &&
        normalizedCampus !== "all" &&
        normalizedCampus !== "-"
      ) {
        query = query.eq("campus", normalizedCampus);
      }

      const { data, error } = await query.order("student_name", { ascending: true });

      if (error) {
        console.error("STUDENTS SELECT ERROR", error);
        return NextResponse.json({ error }, { status: 500 });
      }

      const rows = (data ?? []) as StudentRow[];
      return formatResponse(rows, page, pageSize);
    }

    // 3. Other roles -> Forbidden
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 500 });
  }
}

function formatResponse(rows: StudentRow[], page: number, pageSize: number) {
  const base: Student[] = rows.map((r) => ({
    id: String(r.student_id),
    name: String(r.student_name ?? ""),
    englishName: String(r.english_first_name ?? ""),
    classId: String(r.main_class ?? r.class_id ?? ""),
    birthDate: String(r.birth_date ?? ""),
    phone: String(r.parent_phone ?? ""),
    className: String(r.class_name ?? ""),
    campus: String(r.campus ?? ""),
    status: (r.status as Status) ?? "waiting",
    parentName: String(r.parent_name ?? ""),
    parentAccountId: String(r.parent_auth_user_id ?? ""),
    address: String(r.address ?? ""),
    bus: String(r.bus ?? ""),
    departureTime: String(r.departure_time ?? ""),
    pickupType: (r.pickup_type as any) ?? "self",
    dropoffType: (r.dropoff_type as any) ?? "self",
  }));
  const total = base.length;
  const start = (page - 1) * pageSize;
  const items = base.slice(start, start + pageSize);
  return NextResponse.json({ items, total, page, pageSize }, { status: 200 });
}
