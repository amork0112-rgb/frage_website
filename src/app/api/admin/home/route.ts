//src/app/api/admin/home/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const campus = searchParams.get("campus");
    const supabase = createSupabaseServer();
    const guard = await requireAdmin(supabase);
    if ("error" in guard) return guard.error;

    const allowedRequestTypes = ["absence", "early_pickup", "bus_change", "medication"];
    let requestsQuery = supabaseService
      .from("portal_requests")
      .select("*", { count: "exact", head: true })
      .in("type", allowedRequestTypes);

    if (campus && campus !== "All") {
      requestsQuery = requestsQuery.eq("campus", campus);
    }

    const { count: newRequestsCountRaw } = await requestsQuery;
    const newRequestsCount = typeof newRequestsCountRaw === "number" ? newRequestsCountRaw : 0;

    let postsQuery = supabaseService
      .from("posts")
      .select("category,is_archived,campus")
      .eq("category", "notice")
      .eq("is_archived", false);
    
    if (campus && campus !== "All") {
      postsQuery = postsQuery.or(`campus.eq.All,campus.eq.${campus}`);
    }

    const { data: posts } = await postsQuery;
    const noticesCount = Array.isArray(posts) ? posts.length : 0;

    // 3. New Students (Guest Inquiries)
    let newStudentsQuery = supabaseService
      .from("new_students")
      .select("id,status,campus");
    
    if (campus && campus !== "All") {
      newStudentsQuery = newStudentsQuery.eq("campus", campus);
    }

    const { data: newStudents } = await newStudentsQuery;

    const { data: reservations } = await supabaseService
      .from("student_reservations")
      .select("student_id");
    
    const reservationSet = new Set((reservations || []).map((r: any) => String(r.student_id)));

    const guestInquiriesCount = Array.isArray(newStudents)
      ? newStudents.filter((s: any) => {
          const isWaiting = String(s.status || "waiting") === "waiting";
          const hasReservation = reservationSet.has(String(s.id));
          return isWaiting || hasReservation;
        }).length
      : 0;

    // 4. Enrolled Students (Total Enrolled)
    let studentsQuery = supabaseService
      .from("students")
      .select("id,status,campus");

    if (campus && campus !== "All") {
      studentsQuery = studentsQuery.eq("campus", campus);
    }

    const { data: students } = await studentsQuery;
    const totalEnrolled = Array.isArray(students) ? students.filter((s: any) => String(s.status || "재원") === "재원").length : 0;

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    const inRange = (start?: string, end?: string) => {
      if (!start) return false;
      if (end && end >= start) {
        return todayStr >= start && todayStr <= end;
      }
      return todayStr === start;
    };

    // 5. Absences (Today's Attendance)
    let absencesQuery = supabaseService
      .from("portal_requests")
      .select("type,payload,campus")
      .eq("type", "absence")
      .order("created_at", { ascending: false })
      .limit(1000);
    
    if (campus && campus !== "All") {
      absencesQuery = absencesQuery.eq("campus", campus);
    }

    const { data: absences } = await absencesQuery;
    const todaysAbsences = Array.isArray(absences)
      ? absences.filter((r: any) => {
          const payload = r?.payload || {};
          return String(r?.type || "") === "absence" && inRange(String(payload?.dateStart || ""), String(payload?.dateEnd || ""));
        }).length
      : 0;

    const todayAttendanceCount =
      totalEnrolled > 0
        ? Math.round(((totalEnrolled - todaysAbsences) / totalEnrolled) * 100)
        : 0;

    return json({
      newRequestsCount,
      noticesCount,
      guestInquiriesCount,
      todayAttendanceCount,
    });
  } catch {
    return json({ error: "server_error" }, 500);
  }
}
