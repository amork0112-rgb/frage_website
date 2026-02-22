import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.log(`[API/portal/home] User authenticated, ID: ${user.id}`);
    const role = await resolveUserRole(user);

    // 1. Fetch parent ID
    const { data: parent, error: parentError } = await supabaseService
      .from("parents")
      .select("id,parent_name,phone")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (parentError || !parent) {
      console.error("[API/portal/home] No parent found or error (maybeSingle):", parentError?.message);
      console.log("[API/portal/home] parent data:", parent);
      console.log("[API/portal/home] parent error:", parentError);
      return NextResponse.json({ ok: true, type: "no_parent" }, { status: 200 });
    }
    const parentId = String(parent.id);
    console.log("[API/portal/home] Parent found, ID:", parentId);

    // ✅ Legacy student auto-link (재원생 최초 로그인 1회)
    await supabaseService
      .from("students")
      .update({ parent_auth_user_id: user.id })
      .eq("parent_id", parent.id)
      .is("parent_auth_user_id", null);

    // 1. Fetch Enrolled Students (Promoted)
      const { data: enrolledStudents, error: enrolledErr } = await supabaseService
        .from("students")
        .select(`
          id,
          student_name,
          english_first_name,
          status,
          campus,
          parent_auth_user_id,
          main_class,
          use_bus,
          address,
          profile_completed,
          classes (
            name
          )
        `)
        .eq("parent_auth_user_id", user.id);
    console.log("[API/portal/home] enrolledStudents data:", enrolledStudents);
    console.log("[API/portal/home] enrolledStudents error:", enrolledErr);

    // 2. Fetch Applicants (New Students not yet promoted)
    const { data: applicantStudents } = await supabaseService
      .from("new_students")
      .select("id,student_name,status,campus,created_by")
      .eq("created_by", user.id)
      .not("status", "eq", "promoted"); // Exclude those already promoted

    const enrolledIds = Array.isArray(enrolledStudents)
      ? enrolledStudents.map((s: any) => s.id).filter((v: any) => v)
      : [];
    console.log("[API/portal/home] enrolledIds after mapping:", enrolledIds);

    let onboardingMap: Record<
      string,
      {
        student_name: string | null;
        profile_completed: boolean | null;
        use_bus: boolean | null;
        address: string | null;
        parent_auth_user_id: string | null;
        class_name: string | null;
        class_id: string | null; // Added class_id to type definition
      }
    > = {};

    let latestReportsMap: Record<string, any> = {};
    let pendingVideoMap: Record<string, number> = {};

    if (enrolledIds.length > 0) {
      console.log("[API/portal/home] enrolledIds is not empty. Proceeding with fetching related data.");
      // 1. Fetch Onboarding & Class Info
      const { data: studentInfo } = await supabaseService
      .from("students")
      .select(`
        id,
        student_name,
        profile_completed,
        use_bus,
        address,
        parent_auth_user_id,
        main_class,
        classes (
          name
        )
      `)
      .in("id", enrolledIds as any);

      onboardingMap =
        Array.isArray(studentInfo)
          ? studentInfo.reduce((acc: any, row: any) => {
              const key = String(row.id || "");
              if (!key) return acc;
              acc[key] = {
                student_name: row.student_name,
                profile_completed: row.profile_completed === true,
                use_bus: row.use_bus,
                address: row.address,
                parent_auth_user_id: row.parent_auth_user_id,
                class_name: row.classes?.name || null,
                class_id: row.main_class || null,
              };
              return acc;
            }, {})
          : {};

      // 2. Fetch Latest Daily Reports (Dajim)
      // Get the single latest report for each student
      const { data: reports } = await supabaseService
        .from("daily_reports")
        .select("id, student_id, message_text, completion_rate, date, send_status")
        .in("student_id", enrolledIds as any)
        .eq("send_status", "sent")
        .order("date", { ascending: false });

      if (reports) {
        // Group by student and take the first (latest) one
        reports.forEach((r: any) => {
          if (!latestReportsMap[r.student_id]) {
            latestReportsMap[r.student_id] = r;
          }
        });
      }

      // 3. Fetch Pending Video Homework Count
      // For each student, count submissions that are 'submitted' but not yet reviewed (no AI or teacher feedback)
      for (const sId of enrolledIds) {
        const { data: submissionsWithFeedback, error } = await supabaseService
          .from("portal_video_submissions")
          .select(
            `
            assignment_key,
            ai_evaluation:ai_video_evaluations!left(assignment_key),
            teacher_feedback:portal_video_feedback!left(assignment_key)
            `
          )
          .eq("student_id", sId)
          .eq("status", "submitted");

        if (error) {
          console.error(`❌ Error fetching submissions for student ${sId}:`, error);
          continue;
        }

        const unreviewedCount = (submissionsWithFeedback || []).filter((sub: any) => {
            const aiEval = (sub.ai_evaluation as any)?.[0];
            const teacherFeedback = (sub.teacher_feedback as any)?.[0];
            return !aiEval && !teacherFeedback;
        }).length;

        if (unreviewedCount > 0) {
          pendingVideoMap[sId] = unreviewedCount;
        }
      }
    }

    const enrolledItems = Array.isArray(enrolledStudents)
      ? enrolledStudents.map((s: any) => {
          const key = String(s.id || "");
          const onboarding = key ? onboardingMap[key] : undefined;
          const latestReport = key ? latestReportsMap[key] : null;
          const pendingVideo = key ? pendingVideoMap[key] : 0;

          return {
            id: key,
            name: String(
              onboarding?.student_name ||
              s.student_name ||
              s.english_first_name ||
              ""
            ),
            englishName: String(
              s.english_first_name ??
              onboarding?.student_name ??
              ""
            ),
            status: String(s.status || "promoted"),
            className: String(s.classes?.name || s.grade || ""),
            campus: String(s.campus || ""),
            parentAccountId: String(s.parent_auth_user_id || ""),
            profile_completed: onboarding?.profile_completed ?? false,
            parent_auth_user_id: onboarding
              ? onboarding.parent_auth_user_id
              : null,
            use_bus: onboarding?.use_bus ?? null,
            address: onboarding?.address ?? null,
            type: "enrolled",
            latestReport: latestReport ? {
              id: latestReport.id,
              message: latestReport.message_text,
              rate: latestReport.completion_rate,
              date: latestReport.date,
            } : null,
            pendingVideoCount: pendingVideo,
          };
        })
      : [];
    console.log("[API/portal/home] enrolledItems after mapping:", enrolledItems);

    const applicantItems = Array.isArray(applicantStudents)
      ? applicantStudents.map((s: any) => ({
          id: String(s.id),
          name: String(s.student_name || ""),
          englishName: "",
          status: String(s.status || "applicant"),
          className: "Admission Process",
          campus: String(s.campus || ""),
          parentAccountId: String(s.created_by || ""),
          profile_completed: false, // Applicants always need onboarding/info check
          type: "applicant",
      }))
      : [];
    console.log("[API/portal/home] applicantItems after mapping:", applicantItems);

    const students = [...enrolledItems, ...applicantItems];
    console.log("[API/portal/home] Final students array before response:", students);

    return NextResponse.json({ ok: true, students }, { status: 200 });
  } catch(err) {
    console.error("🔥 API/portal/home ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
