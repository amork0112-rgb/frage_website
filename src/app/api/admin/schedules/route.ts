import { NextResponse } from "next/server";

type ScheduleSlot = {
  id: string;
  date: string;
  time: string;
  max: number;
  current: number;
  isOpen: boolean;
  note?: string;
};

let SCHEDULES: ScheduleSlot[] = [];

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const start = searchParams.get("rangeStart");
  const end = searchParams.get("rangeEnd");
  if (date) {
    const items = SCHEDULES.filter((s) => s.date === date).sort((a, b) =>
      a.time.localeCompare(b.time)
    );
    return json({ items });
  }
  if (start && end) {
    const items = SCHEDULES.filter((s) => s.date >= start && s.date <= end).sort((a, b) => {
      const ad = a.date.localeCompare(b.date);
      if (ad !== 0) return ad;
      return a.time.localeCompare(b.time);
    });
    return json({ items });
  }
  const items = SCHEDULES.slice().sort((a, b) => {
    const ad = a.date.localeCompare(b.date);
    if (ad !== 0) return ad;
    return a.time.localeCompare(b.time);
  });
  return json({ items });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const date = String(body.date || "");
    const time = String(body.time || "");
    const max = Number(body.max ?? 5);
    const current = Number(body.current ?? 0);
    const isOpen = Boolean(body.isOpen ?? true);
    if (!date || !time) return json({ error: "missing" }, 400);
    const dup = SCHEDULES.find((s) => s.date === date && s.time === time);
    if (dup) return json({ error: "duplicate" }, 409);
    const id = `sch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const slot: ScheduleSlot = { id, date, time, max, current, isOpen };
    SCHEDULES.push(slot);
    return json({ item: slot }, 201);
  } catch {
    return json({ error: "invalid" }, 400);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return json({ error: "missing id" }, 400);
    const idx = SCHEDULES.findIndex((s) => s.id === id);
    if (idx < 0) return json({ error: "not found" }, 404);
    const prev = SCHEDULES[idx];
    const next: ScheduleSlot = {
      ...prev,
      date: body.date ? String(body.date) : prev.date,
      time: body.time ? String(body.time) : prev.time,
      max: typeof body.max === "number" ? body.max : prev.max,
      current: typeof body.current === "number" ? body.current : prev.current,
      isOpen: typeof body.isOpen === "boolean" ? body.isOpen : prev.isOpen,
      note: body.note !== undefined ? String(body.note) : prev.note,
    };
    if ((next.date !== prev.date || next.time !== prev.time) && SCHEDULES.find((s) => s.date === next.date && s.time === next.time && s.id !== id)) {
      return json({ error: "duplicate" }, 409);
    }
    SCHEDULES[idx] = next;
    return json({ item: next });
  } catch {
    return json({ error: "invalid" }, 400);
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return json({ error: "missing id" }, 400);
    const before = SCHEDULES.length;
    SCHEDULES = SCHEDULES.filter((s) => s.id !== id);
    if (SCHEDULES.length === before) return json({ error: "not found" }, 404);
    return json({ ok: true });
  } catch {
    return json({ error: "invalid" }, 400);
  }
}

