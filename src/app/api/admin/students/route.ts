export const dynamic = "force-dynamic";
// src/app/api/admin/students/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { createSupabaseServer } from "@/lib/supabase/server";

type Status = "waiting" | "consultation_reserved" | "consult_done" | "approved" | "promoted" | "rejected" | "hold";

export type StudentView = {
  // identity
  student_id: string;

  // student
  student_name: string;
  birth_date: string | null;
  gender: "M" | "F" | null;
  campus: string;
  english_first_name?: string | null;
  status: Status;
  dajim_enabled: boolean;
  use_bus?: boolean | null;

  // address / transport
  address?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;

  // parent
  parent_id?: string | null;
  parent_auth_user_id?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;

  // class
  class_id?: string | null;
  class_name?: string | null;
  class_sort_order?: number | null;
};


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const campus = searchParams.get("campus");
  const classId = searchParams.get("classId");
  const dajim = searchParams.get("dajim");
  const name = searchParams.get("name");
  const birthMonth = searchParams.get("birthMonth");

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 50);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createSupabaseServer();

  let query = supabase
    .from("v_students_full")
    .select(`
      student_id,
      student_name,
      birth_date,
      campus,
      class_name,
      class_id,
      class_sort_order,
      parent_phone,
      dajim_enabled,
      use_bus
    `, { count: "exact" });

  if (campus && campus !== "All") {
    query = query.eq("campus", campus);
  }

  // Frontend sends class NAME as classId param
  if (classId && classId !== "All") {
    query = query.eq("class_name", classId);
  }

  if (dajim && dajim !== "All") {
    query = query.eq("dajim_enabled", dajim === "O");
  }

  if (name) {
    query = query.ilike("student_name", `%${name}%`);
  }

  if (birthMonth && birthMonth !== "All") {
    query = query.gte(
      "birth_date",
      `2000-${birthMonth.padStart(2, "0")}-01`
    ).lte(
      "birth_date",
      `2000-${birthMonth.padStart(2, "0")}-31`
    );
  }

  query = query
    .order("class_sort_order", { ascending: true })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }

  // Fetch program enrollments for these students
  // Deduplicate students by ID just in case the view returns duplicates
  const rawStudents = data ?? [];
  const uniqueStudentsMap = new Map();
  rawStudents.forEach((s: any) => {
    if (s.student_id && !uniqueStudentsMap.has(s.student_id)) {
      uniqueStudentsMap.set(s.student_id, s);
    }
  });
  const students = Array.from(uniqueStudentsMap.values());
  const studentIds = students.map((s: any) => s.student_id);
  
  if (studentIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id, class:classes(id, name)")
      .in("student_id", studentIds)
      .eq("enrollment_type", "program")
      .eq("status", "active");

    const enrollmentMap: Record<string, any[]> = {};
    (enrollments || []).forEach((e: any) => {
      if (!enrollmentMap[e.student_id]) enrollmentMap[e.student_id] = [];
      if (e.class) {
        enrollmentMap[e.student_id].push({ id: e.class.id, name: e.class.name });
      }
    });

    students.forEach((s: any) => {
      s.program_classes = enrollmentMap[s.student_id] || [];
    });
  }

  return NextResponse.json({
    items: students,
    totalCount: count ?? 0,
  });
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
