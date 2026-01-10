//src/app/api/admin/home/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const guard = await requireAdmin(supabase);
    if ("error" in guard) return guard.error;

    const { data: latestRequests } = await supabase
      .from("portal_requests")
      .select("id,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const newRequestsCount = Array.isArray(latestRequests) ? latestRequests.length : 0;

    const { data: posts } = await supabase
      .from("posts")
      .select("is_pinned");
    const noticesCount = Array.isArray(posts) ? posts.filter((p: any) => !!p.is_pinned).length : 0;

    const { data: signups } = await supabase
      .from("signups")
      .select("status");
    const guestInquiriesCount = Array.isArray(signups) ? signups.filter((s: any) => String(s.status || "") !== "enrolled").length : 0;

    const { data: students } = await supabase
      .from("students")
      .select("id,status");
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

    const { data: absences } = await supabase
      .from("portal_requests")
      .select("type,payload")
      .eq("type", "absence")
      .order("created_at", { ascending: false })
      .limit(1000);
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
