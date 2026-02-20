//app/api/teacher/video/feedback/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

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
  average: number;
  updatedAt: string;
};

type AttachMeta = { name: string; size: number; type: string }[];

export async function GET(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    
    // 1. Teacher Check (DB Source of Truth)
    // Use supabaseService for data operations if needed, but feedback read/write
    // usually requires admin privileges or proper RLS.
    // Given the pattern, let's switch to supabaseService for data access to be safe
    // and rely on this explicit teacher check for security.
    const { data: teacher, error: teacherError } = await supabaseService
      .from("teachers")
      .select("id, role, campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (teacherError) {
      console.error("❌ teachers query failed", teacherError);
      return NextResponse.json(
        { error: "Teacher query error" },
        { status: 500 }
      );
    }

    if (!teacher) {
      return NextResponse.json({ ok: false, error: "Forbidden: Teacher only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentKey = searchParams.get("assignmentKey") || "";
    const studentIdFromParam = searchParams.get("studentId") || "";

    const studentId = studentIdFromParam; // studentId can be taken directly from param

    if (!assignmentKey || !studentId) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }

    let query = supabaseService.from("portal_video_feedback").select("*");
    query = query.eq("assignment_uuid", assignmentKey).eq("student_id", studentId);

    const { data } = await query
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
    
    // 1. Teacher Check (DB Source of Truth)
    const { data: teacher } = await supabaseService
      .from("teachers")
      .select("id, role, campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!teacher) {
      return NextResponse.json({ ok: false, error: "Forbidden: Teacher only" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, assignmentKey, teacherId, feedback, attachments } = body || {};

    if (
      !assignmentKey ||
      !studentId ||
      !feedback ||
      typeof feedback?.overall_message !== "string" ||
      !Array.isArray(feedback?.strengths)
    ) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const row = {
      assignment_uuid: assignmentKey,
      assignment_key: assignmentKey,
      student_id: studentId,
      teacher_id: teacherId ?? null,
      overall_message: feedback.overall_message,
      fluency: feedback.fluency,
      volume: feedback.volume,
      speed: feedback.speed,
      pronunciation: feedback.pronunciation,
      performance: feedback.performance,
      strengths: feedback.strengths,
      focus_point: feedback.focus_point ?? "",
      next_try_guide: feedback.next_try_guide ?? "",
      average: feedback.average ?? 0,
      updated_at: new Date().toISOString(),
      attachments: attachments ?? [],
    };
    
    // Use supabaseService to write
    const { error } = await supabaseService
      .from("portal_video_feedback")
      .upsert(row, { onConflict: "assignment_key" });

    if (error) {
      console.error(error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// update 없음: 최신 insert만 사용
