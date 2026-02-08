// app/api/teacher/classes/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campusParam = searchParams.get("campus");

    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json([], { status: 401 });

    // 1️⃣ Teacher 존재 여부로 권한 판단
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id, role, campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!teacher) {
      return NextResponse.json([], { status: 403 });
    }

    // ✅ 캠퍼스 필터링 로직 (master_teacher 예외 처리)
    let query = supabase
      .from("classes")
      .select("id, name, campus, sort_order");

    // master_teacher → 전체
    // 일반 teacher / campus → 본인 캠퍼스만
    if (teacher.role !== "master_teacher") {
      query = query.eq("campus", teacher.campus);
    } else {
      if (campusParam && campusParam !== "All") {
        query = query.eq("campus", campusParam);
      }
    }

    const { data, error } = await query
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Teacher Classes Error:", error);
      return NextResponse.json([], { status: 500 });
    }

    // Fetch class schedules to determine weekdays
    const classIds = (data || []).map((c: any) => c.id);
    let schedulesMap: Record<string, string[]> = {};
    
    if (classIds.length > 0) {
      const { data: schedules } = await supabase
        .from("class_schedules")
        .select("class_id, weekdays")
        .in("class_id", classIds);
        
      if (schedules) {
        schedules.forEach((s: any) => {
          schedulesMap[s.class_id] = Array.isArray(s.weekdays) ? s.weekdays : [];
        });
      }
    }

    const items = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      campus: row.campus,
      sortOrder: row.sort_order,
      weekdays: schedulesMap[row.id] || [], // Add weekdays to response
    }));

    // Return array directly to match client expectations
    return NextResponse.json(items, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json([], { status: 500 });
  }
}
