import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
// RLS enforced: use SSR client only

type FeedbackPayload = {
  overall_message: string;
  fluency: number;
  volume: number;
  speed: number;
  pronunciation: number;
  performance: number;
  strengths: string[];
  focus_point: string;
  next_try_guide: string;
  parent_report_message: string;
  average: number;
  updatedAt: string;
};

type AttachMeta = { name: string; size: number; type: string }[];

export async function GET(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    let role = user.app_metadata?.role ?? "parent";
    if (role === "parent") {
      const { data: teacher } = await supabaseAuth
        .from("teachers")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (teacher?.role) {
        role = teacher.role;
      }
    }
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
    const assignmentId = searchParams.get("assignmentId") || "";
    if (!studentId || !assignmentId) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }
    const { data } = await supabaseAuth
      .from("portal_video_feedback")
      .select("*")
      .eq("student_id", studentId)
      .eq("assignment_id", assignmentId)
      .order("updated_at", { ascending: false })
      .limit(1);
    const item = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!item) return NextResponse.json({ ok: true, item: null }, { status: 200 });
    const payload: FeedbackPayload = {
      overall_message: String(item.overall_message ?? ""),
      fluency: Number(item.fluency ?? 0),
      volume: Number(item.volume ?? 0),
      speed: Number(item.speed ?? 0),
      pronunciation: Number(item.pronunciation ?? 0),
      performance: Number(item.performance ?? 0),
      strengths: Array.isArray(item.strengths) ? item.strengths : [],
      focus_point: String(item.focus_point ?? ""),
      next_try_guide: String(item.next_try_guide ?? ""),
      parent_report_message: String(item.parent_report_message ?? ""),
      average: Number(item.average ?? 0),
      updatedAt: String(item.updated_at ?? item.updatedAt ?? ""),
    };
    return NextResponse.json({ ok: true, item: payload }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    let role = user.app_metadata?.role ?? "parent";
    if (role === "parent") {
      const { data: teacher } = await supabaseAuth
        .from("teachers")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (teacher?.role) {
        role = teacher.role;
      }
    }
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
    const { studentId, assignmentId, feedback, attachments } = body || {};
    if (
      !studentId ||
      !assignmentId ||
      !feedback ||
      typeof feedback?.overall_message !== "string" ||
      !Array.isArray(feedback?.strengths)
    ) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const row = {
      assignment_id: assignmentId,
      student_id: studentId,
      teacher_id: String(user.id),
      overall_message: feedback.overall_message,
      fluency: feedback.fluency,
      volume: feedback.volume,
      speed: feedback.speed,
      pronunciation: feedback.pronunciation,
      performance: feedback.performance,
      strengths: feedback.strengths,
      focus_point: feedback.focus_point,
      next_try_guide: feedback.next_try_guide,
      parent_report_message: feedback.parent_report_message ?? "",
      average: feedback.average,
      updated_at: feedback.updatedAt,
      attachments: Array.isArray(attachments) ? attachments : ([] as AttachMeta),
    };
    const { error } = await supabaseAuth.from("portal_video_feedback").insert(row);
    if (error) return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// update 없음: 최신 insert만 사용
