import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    const role = user.app_metadata?.role ?? "parent";
    if (role !== "teacher") return NextResponse.json({ ok: false }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || "";
    const month = searchParams.get("month") || "";
    if (!studentId || !month) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }
    const { data, error } = await supabaseService
      .from("teacher_reports")
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
          className: String(row.class_name || ""),
          gender: row.gender === "F" ? "F" : "M",
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
    const role = user.app_metadata?.role ?? "parent";
    if (role !== "teacher") return NextResponse.json({ ok: false }, { status: 403 });
    const body = await req.json();
    const { studentId, month, className, gender, scores, comments, videoScores, overall } = body || {};
    if (
      !studentId ||
      !month ||
      !className ||
      (gender !== "M" && gender !== "F") ||
      !scores ||
      !comments ||
      !videoScores ||
      typeof overall !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const payload = {
      student_id: studentId,
      month,
      class_name: className,
      gender,
      scores,
      comments,
      video_scores: videoScores,
      overall,
      status: "작성중",
      updated_at: now,
    };
    const { error } = await supabaseService
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
    const role = user.app_metadata?.role ?? "parent";
    if (role !== "teacher") return NextResponse.json({ ok: false }, { status: 403 });
    const body = await req.json();
    const { studentId, month, status } = body || {};
    if (!studentId || !month || !status) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const { error } = await supabaseService
      .from("teacher_reports")
      .update({ status, updated_at: now })
      .eq("student_id", studentId)
      .eq("month", month);
    if (error) {
      console.error(error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    if (status === "발송요청") {
      await supabaseService
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
