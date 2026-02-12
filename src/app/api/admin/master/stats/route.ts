import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await resolveUserRole(user);
    if (role !== "master_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. 재원 학생 관련 통계
    const { data: students, error: studentsError } = await supabaseService
      .from("students")
      .select("id, status, campus, created_at, updated_at");

    if (studentsError) throw studentsError;

    const activeStudents = students.filter(s => s.status === "재원");
    const totalActiveCount = activeStudents.length;

    const campusActiveCount = activeStudents.reduce((acc: Record<string, number>, s) => {
      acc[s.campus] = (acc[s.campus] || 0) + 1;
      return acc;
    }, {});

    // 월별 신규 등록 (students.created_at 기준)
    const monthlyRegistrations = students.reduce((acc: Record<string, number>, s) => {
      const month = s.created_at.substring(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    // 2. 신입 상담(new_students) 관련 통계
    const { data: newStudents, error: newStudentsError } = await supabaseService
      .from("new_students")
      .select("id, status, campus, promoted_student_id, created_at");

    if (newStudentsError) throw newStudentsError;

    const totalConsultations = newStudents.length;
    const totalPromoted = newStudents.filter(s => s.promoted_student_id !== null).length;
    const overallConversionRate = totalConsultations > 0 ? (totalPromoted / totalConsultations) * 100 : 0;

    const campusConversion = newStudents.reduce((acc: Record<string, { total: number; promoted: number }>, s) => {
      if (!acc[s.campus]) acc[s.campus] = { total: 0, promoted: 0 };
      acc[s.campus].total += 1;
      if (s.promoted_student_id !== null) acc[s.campus].promoted += 1;
      return acc;
    }, {});

    const campusConversionRates = Object.entries(campusConversion).reduce((acc: Record<string, number>, [campus, stats]) => {
      acc[campus] = stats.total > 0 ? (stats.promoted / stats.total) * 100 : 0;
      return acc;
    }, {});

    // 3. 퇴원율 관련 (단순 버전)
    const now = new Date();
    const currentMonthStr = now.toISOString().substring(0, 7);
    
    const monthlyWithdrawals = students.filter(s => 
      s.status === "퇴원" && 
      s.updated_at && s.updated_at.substring(0, 7) === currentMonthStr
    ).length;

    const withdrawalRate = totalActiveCount > 0 ? (monthlyWithdrawals / totalActiveCount) * 100 : 0;

    return NextResponse.json({
      students: {
        totalActive: totalActiveCount,
        byCampus: campusActiveCount,
        monthlyRegistrations: Object.entries(monthlyRegistrations)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6), // 최근 6개월
      },
      conversion: {
        totalConsultations,
        totalPromoted,
        overallRate: overallConversionRate,
        byCampus: campusConversionRates,
      },
      withdrawal: {
        count: monthlyWithdrawals,
        rate: withdrawalRate,
      }
    });

  } catch (error: any) {
    console.error("Error fetching master stats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
