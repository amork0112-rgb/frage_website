import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const role = await resolveUserRole(user);
    if (!["teacher", "master_teacher", "admin", "master_admin"].includes(role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // 1. Get Teacher Profile
    const { data: teacher } = await supabaseService
      .from("teachers")
      .select("id, name, class_name")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const teacherName = teacher?.name || user.user_metadata?.name || user.email?.split("@")[0] || "Teacher";
    const teacherClass = teacher?.class_name || null;
    const teacherId = teacher?.id || null;

    // 2. Fetch Events (This Month)
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const startOfMonthStr = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endOfMonthStr = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;

    const { data: calendarData } = await supabaseService
      .from("academic_calendar")
      .select("id, title, type, start_date, end_date, campus, class_name, place")
      .gte("start_date", startOfMonthStr)
      .lte("start_date", endOfMonthStr)
      .order("start_date", { ascending: true });

    const events = (calendarData || []).map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      start: e.start_date,
      end: e.end_date,
      campus: e.campus,
      className: e.class_name,
      place: e.place,
      exposeToParent: true,
      notify: false
    }));

    // 3. Today's Reservations
    const mm = String(m).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${mm}-${dd}`;

    const { data: slotsToday } = await supabaseService
      .from("consultation_slots")
      .select("id")
      .eq("date", todayStr);
    
    let todayReservationsCount = 0;
    const slotIds = (slotsToday || []).map((s: any) => s.id);
    if (slotIds.length > 0) {
      const { count } = await supabaseService
        .from("student_reservations")
        .select("*", { count: "exact", head: true })
        .in("slot_id", slotIds);
      todayReservationsCount = count || 0;
    }

    // 4. Pending Checklists
    // Check if table exists first or handle error, but assuming it exists
    const { count: pendingChecklistsCount } = await supabaseService
      .from("new_student_checklists")
      .select("*", { count: "exact", head: true })
      .eq("checked", false);

    // 5. Unread Portal Requests
    let unreadRequestsCount = 0;
    if (teacherId) {
      const { count } = await supabaseService
        .from("portal_requests")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("teacher_read", false);
      unreadRequestsCount = count || 0;
    }

    // 6. My Students
    let myStudents: any[] = [];
    if (teacherClass) {
      const { data: students } = await supabaseService
        .from("v_students_full")
        .select("student_id, student_name, english_first_name, class_name, campus")
        .eq("class_name", teacherClass)
        .limit(12);
      
      myStudents = (students || []).map(s => ({
        id: s.student_id,
        name: s.student_name,
        englishName: s.english_first_name,
        className: s.class_name,
        campus: s.campus
      }));
    }

    return NextResponse.json({
      ok: true,
      data: {
        teacherName,
        teacherClass,
        events: events || [],
        stats: {
          todayReservations: todayReservationsCount,
          pendingChecklists: pendingChecklistsCount || 0,
          unreadRequests: unreadRequestsCount
        },
        myStudents
      }
    });

  } catch (e) {
    console.error("Teacher Home API Error:", e);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
