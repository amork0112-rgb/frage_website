import { NextResponse } from "next/server";
import { pushStore } from "@/server/store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || "";
    if (!studentId) {
      return NextResponse.json({ ok: false, error: "missing_studentId" }, { status: 400 });
    }
    const list = pushStore.get(studentId) || [];
    const items = list.map(n => ({ ...n, date: n.createdAt }));
    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const studentId = String(body?.studentId || "");
    const message = String(body?.message || "");
    if (!studentId || !message) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const item = {
      id: `push-${studentId}-${Date.now()}`,
      studentId,
      message,
      createdAt: now,
    };
    const list = pushStore.get(studentId) || [];
    pushStore.set(studentId, [item, ...list].slice(0, 50));
    return NextResponse.json({ ok: true, item: { ...item, date: item.createdAt } }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
