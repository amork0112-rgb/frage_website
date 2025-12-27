import { NextResponse } from "next/server";

type Feedback = {
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

type StoreItem = {
  studentId: string;
  dueDate: string;
  feedback: Feedback;
  attachments?: { name: string; size: number; type: string }[];
};

const store: Map<string, StoreItem> = new Map();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || "";
    const dueDate = searchParams.get("dueDate") || "";
    if (!studentId || !dueDate) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }
    const key = `${studentId}_${dueDate}`;
    const item = store.get(key);
    return NextResponse.json({ ok: true, item: item?.feedback || null }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, dueDate, feedback, attachments } = body || {};
    if (
      !studentId ||
      !dueDate ||
      !feedback ||
      typeof feedback?.overall_message !== "string" ||
      !Array.isArray(feedback?.strengths)
    ) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const key = `${studentId}_${dueDate}`;
    store.set(key, { studentId, dueDate, feedback, attachments });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { studentId, dueDate, feedback, attachments } = body || {};
    if (!studentId || !dueDate || !feedback) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const key = `${studentId}_${dueDate}`;
    const prev = store.get(key);
    const next: StoreItem = {
      studentId,
      dueDate,
      feedback,
      attachments: attachments ?? prev?.attachments ?? []
    };
    store.set(key, next);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

