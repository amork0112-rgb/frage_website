import { NextResponse } from "next/server";
import { publishedReportsStore } from "@/server/store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || "";
    if (!studentId) {
      return NextResponse.json({ ok: false, error: "missing_studentId" }, { status: 400 });
    }
    const list = publishedReportsStore.get(studentId) || [];
    return NextResponse.json({ ok: true, items: list }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
