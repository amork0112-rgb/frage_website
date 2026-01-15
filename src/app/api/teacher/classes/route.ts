import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

type ClassItem = {
  id: string;
  name: string;
  campus: string;
};

export async function GET(request: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role ?? "parent";
    if (!["teacher", "master_teacher", "admin", "master_admin"].includes(role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const campus = url.searchParams.get("campus");
    const normalizedCampus = campus?.trim();

    if (role === "teacher") {
      const { data: teacherClasses, error: tcError } = await supabaseService
        .from("teacher_classes")
        .select("class_name")
        .eq("teacher_id", user.id);

      if (tcError) {
        return NextResponse.json({ error: "teacher_classes_error" }, { status: 500 });
      }

      if (!teacherClasses || teacherClasses.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      const classNames = teacherClasses.map((row: any) => row.class_name).filter(Boolean);

      let query = supabaseService
        .from("v_students_full")
        .select("main_class,class_name,campus,status")
        .in("class_name", classNames);

      if (
        normalizedCampus &&
        normalizedCampus !== "All" &&
        normalizedCampus !== "all" &&
        normalizedCampus !== "-"
      ) {
        query = query.eq("campus", normalizedCampus);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: "classes_fetch_failed" }, { status: 500 });
      }

      const items = buildClassItems(data || []);
      return NextResponse.json(items, { status: 200 });
    }

    let query = supabaseService
      .from("v_students_full")
      .select("main_class,class_name,campus,status");

    if (
      normalizedCampus &&
      normalizedCampus !== "All" &&
      normalizedCampus !== "all" &&
      normalizedCampus !== "-"
    ) {
      query = query.eq("campus", normalizedCampus);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "classes_fetch_failed" }, { status: 500 });
    }

    const items = buildClassItems(data || []);
    return NextResponse.json(items, { status: 200 });
  } catch {
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}

function buildClassItems(rows: any[]): ClassItem[] {
  const map: Record<string, ClassItem> = {};
  for (const row of rows) {
    const id = String(row.main_class ?? "");
    const name = String(row.class_name ?? "");
    const campus = String(row.campus ?? "");
    if (!id || !name || !campus) continue;
    if (map[id]) continue;
    map[id] = { id, name, campus };
  }
  return Object.values(map);
}

