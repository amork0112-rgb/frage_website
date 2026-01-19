import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
// RLS enforced: use SSR client only

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    let role = user.app_metadata?.role ?? "parent";

    // Fallback: Check teachers table
    if (role === "parent") {
      const { data: teacher } = await supabaseService
        .from("teachers")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (teacher?.role) {
        role = teacher.role;
      }
    }

    // Fallback: Master teacher email
    if (user.email === "master_teacher@frage.com") {
      role = "master_teacher";
    }

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
    const studentId = searchParams.get("studentId") || "";
    const month = searchParams.get("month") || "";
    if (!studentId || !month) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }
    const { data, error } = await supabaseAuth
      .from("v_teacher_reports_full")
      .select("*")
      .eq("student_id", studentId)
      .eq("month", month)
      .limit(1);
    if (error) {
      console.error(error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    const item = row
      ? {
          studentId: String(row.student_id || ""),
          month: String(row.month || ""),
          className: String(row.student_class_name || row.class_name || ""),
          gender: (row.gender === "F" || row.gender === "Female") ? "F" : "M",
          scores: row.scores || { Reading: 0, Listening: 0, Speaking: 0, Writing: 0 },
          comments: row.comments || { Reading: "", Listening: "", Speaking: "", Writing: "" },
          videoScores: row.video_scores || { fluency: 0, volume: 0, speed: 0, pronunciation: 0, performance: 0 },
          overall: String(row.overall || ""),
          status: String(row.status || "작성중"),
          updatedAt: String(row.updated_at || new Date().toISOString()),
        }
      : null;
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
    let role = user.app_metadata?.role ?? "parent";

    // Fallback: Check teachers table
    if (role === "parent") {
      const { data: teacher } = await supabaseService
        .from("teachers")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (teacher?.role) {
        role = teacher.role;
      }
    }

    // Fallback: Master teacher email
    if (user.email === "master_teacher@frage.com") {
      role = "master_teacher";
    }

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
    const { studentId, month, gender, scores, comments, videoScores, overall } = body || {};
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
      .select("student_name,english_first_name,campus,class_name,main_class,student_id")
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
      // campus: student.campus ?? null,
      // class_id: student.main_class ?? null,
      // class_name: student.class_name ?? null,
      // student_name: student.student_name ?? null,
      // english_first_name: student.english_first_name ?? null,
      // gender, // REMOVED: gender is a derived property from students table, do not store in reports
      scores,
      comments,
      video_scores: videoScores,
      overall,
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
    let role = user.app_metadata?.role ?? "parent";

    // Fallback: Check teachers table
    if (role === "parent") {
      const { data: teacher } = await supabaseService
        .from("teachers")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (teacher?.role) {
        role = teacher.role;
      }
    }

    // Fallback: Master teacher email
    if (user.email === "master_teacher@frage.com") {
      role = "master_teacher";
    }

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
