import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";
// RLS enforced: use SSR client only

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    
    const role = await resolveUserRole(user);

    const teacherRoles = ["teacher", "master_teacher"];
    if (!teacherRoles.includes(role)) return NextResponse.json({ ok: false }, { status: 403 });

    const { data: teacher } = await supabaseAuth
      .from("teachers")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!teacher?.id) {
      return NextResponse.json({ ok: false, error: "teacher_profile_not_found" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || searchParams.get("student_id") || "";
    const month = searchParams.get("month") || "";
    
    if (!month) {
      return NextResponse.json({ ok: false, error: "missing_month" }, { status: 400 });
    }

    // Case 1: Fetch list for the month (only status and basic info)
    if (!studentId) {
      const { data: list, error } = await supabaseService
        .from("teacher_reports")
        .select("student_id, status, updated_at")
        .eq("month", month);
      
      if (error) {
        // Table might not exist yet
        if (error.code === "42P01") {
          return NextResponse.json({ ok: true, items: [] });
        }
        console.error("Fetch reports list error:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, items: list || [] });
    }

    // Case 2: Fetch specific student report detail
    const { data, error } = await supabaseService
      .from("teacher_reports") // Use raw table or view depending on need. Using table for editing.
      .select("*")
      .eq("student_id", studentId)
      .eq("month", month)
      .maybeSingle();

    if (error && error.code !== "42P01") {
      console.error(error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    // Fetch Video Submissions (Latest)
    let videoUrl = null;
    try {
      const { data: vData } = await supabaseService
        .from("portal_video_submissions")
        .select("video_path")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vData?.video_path) {
        const { data: urlData } = await supabaseService.storage
          .from("student-videos")
          .createSignedUrl(vData.video_path, 60 * 60);
        videoUrl = urlData?.signedUrl || null;
      }
    } catch (e) {
      console.error("Video fetch error:", e);
    }

    // Fetch Weekly Video Feedback Status (Fridays)
    const weeklyStatus = [false, false, false, false];
    try {
      const [y, m] = month.split("-").map(Number);
      const fridays: string[] = [];
      const d = new Date(y, m - 1, 1);
      while (d.getMonth() === m - 1) {
        if (d.getDay() === 5) {
          const dd = `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          fridays.push(dd);
        }
        d.setDate(d.getDate() + 1);
      }
      const targetFridays = fridays.slice(0, 4);
      
      if (targetFridays.length > 0) {
        const { data: fData } = await supabaseService
          .from("portal_video_feedback")
          .select("due_date")
          .eq("student_id", studentId)
          .in("due_date", targetFridays);
        
        const feedbackDates = new Set((fData || []).map((f: any) => f.due_date));
        targetFridays.forEach((date, idx) => {
          if (feedbackDates.has(date)) weeklyStatus[idx] = true;
        });
      }
    } catch (e) {
      console.error("Feedback fetch error:", e);
    }

    // Get student details for default gender/class if report doesn't exist
    let studentDetails = null;
    if (!data) {
       const { data: sData } = await supabaseService
        .from("v_students_full")
        .select("gender, class_name")
        .eq("student_id", studentId)
        .maybeSingle();
       studentDetails = sData;
    }

    const item = {
      studentId,
      month,
      className: String(data?.class_name || studentDetails?.class_name || ""),
      gender: (data?.gender || studentDetails?.gender || "M") === "F" ? "F" : "M", // Simple fallback
      scores: data?.scores || { Reading: 0, Listening: 0, Speaking: 0, Writing: 0 },
      comments: data?.comments || { Reading: "", Listening: "", Speaking: "", Writing: "" },
      videoScores: data?.video_scores || { fluency: 0, volume: 0, speed: 0, pronunciation: 0, performance: 0 },
      overall: String(data?.overall || ""),
      participation: String(data?.participation || ""),
      videoSummary: String(data?.video_summary || ""),
      status: String(data?.status || "작성중"),
      updatedAt: String(data?.updated_at || new Date().toISOString()),
      videoUrl,
      weeklyStatus
    };

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    
    const role = await resolveUserRole(user);
    const teacherRoles = ["teacher", "master_teacher"];
    if (!teacherRoles.includes(role)) return NextResponse.json({ ok: false }, { status: 403 });

    const { data: teacher } = await supabaseAuth
      .from("teachers")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!teacher?.id) {
      return NextResponse.json({ ok: false, error: "teacher_profile_not_found" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, month, scores, comments, videoScores, overall, participation, videoSummary } = body || {};
    if (
      !studentId ||
      !month ||
      !scores ||
      !comments ||
      !videoScores ||
      typeof overall !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const { data: student, error: studentError } = await supabaseAuth
      .from("v_students_full")
      .select("student_id")
      .eq("student_id", studentId)
      .maybeSingle();

    if (studentError) {
      console.error("TEACHER_REPORTS_FETCH_STUDENT_ERROR", studentError);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    if (!student) {
      return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const payload = {
      student_id: studentId,
      month,
      teacher_id: teacher.id, // 🔥 이 줄이 핵심
      scores,
      comments,
      video_scores: videoScores,
      overall,
      participation: participation || "",
      video_summary: videoSummary || "",
      status: "작성중",
      updated_at: now,
    };
    const { error } = await supabaseAuth
      .from("teacher_reports")
      .upsert(payload, { onConflict: "student_id,month" });
    if (error) {
      console.error(error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    
    const role = await resolveUserRole(user);

    if (!["teacher", "master_teacher"].includes(role)) return NextResponse.json({ ok: false }, { status: 403 });
    const body = await req.json();
    const { studentId, month, status } = body || {};
    if (!studentId || !month || !status) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const { error } = await supabaseAuth
      .from("teacher_reports")
      .update({ status, updated_at: now })
      .eq("student_id", studentId)
      .eq("month", month);
    if (error) {
      console.error(error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    if (status === "발송요청") {
      await supabaseAuth
        .from("teacher_reports")
        .update({ status: "발송완료", updated_at: now })
        .eq("student_id", studentId)
        .eq("month", month);
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
