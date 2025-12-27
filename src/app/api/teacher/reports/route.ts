import { NextResponse } from "next/server";
import {
  teacherReportsStore,
  publishedReportsStore,
  pushStore,
  ReportItem,
} from "@/server/store";

const store = teacherReportsStore;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || "";
    const month = searchParams.get("month") || "";
    if (!studentId || !month) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }
    const key = `${studentId}_${month}`;
    const item = store.get(key) || null;
    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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
    const key = `${studentId}_${month}`;
    const prev = store.get(key);
    const item: ReportItem = {
      studentId,
      month,
      className,
      gender,
      scores,
      comments,
      videoScores,
      overall,
      status: prev?.status || "작성중",
      updatedAt: new Date().toISOString()
    };
    store.set(key, item);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { studentId, month, status } = body || {};
    if (!studentId || !month || !status) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const key = `${studentId}_${month}`;
    const prev = store.get(key);
    const next: ReportItem = {
      studentId,
      month,
      className: prev?.className || "",
      gender: prev?.gender || "M",
      scores: prev?.scores || { Reading: 0, Listening: 0, Speaking: 0, Writing: 0 },
      comments: prev?.comments || { Reading: "", Listening: "", Speaking: "", Writing: "" },
      videoScores: prev?.videoScores || { fluency: 0, volume: 0, speed: 0, pronunciation: 0, performance: 0 },
      overall: prev?.overall || "",
      status,
      updatedAt: new Date().toISOString()
    };
    store.set(key, next);
    if (status === "발송요청") {
      const pubList = publishedReportsStore.get(studentId) || [];
      const title = `${month} Monthly Report`;
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
      const summary = {
        id: `${studentId}_${month}`,
        title,
        date,
        month,
        status: "Ready" as const,
      };
      const exists = pubList.some((r) => r.id === summary.id);
      const finalList = exists ? pubList.map((r) => (r.id === summary.id ? summary : r)) : [summary, ...pubList];
      publishedReportsStore.set(studentId, finalList);
      const notices = pushStore.get(studentId) || [];
      const notice = {
        id: `push_${Date.now()}`,
        studentId,
        message: "월간 리포트가 발행되었습니다.",
        createdAt: new Date().toISOString(),
      };
      pushStore.set(studentId, [notice, ...notices]);
      next.status = "발송완료";
      store.set(key, next);
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
