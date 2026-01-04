import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const year = Number(body.year ?? 0);
    const month = Number(body.month ?? 0);
    const weekdaysOnly = Boolean(body.weekdaysOnly ?? true);
    const max = Number(body.max ?? 5);
    if (!year || !month) return json({ error: "missing_params" }, 400);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const { data: initRows } = await supabase
      .from("schedule_month_inits")
      .select("*")
      .eq("year", year)
      .eq("month", month)
      .limit(1);
    const already = Array.isArray(initRows) && initRows.length > 0 ? initRows[0] : null;
    if (already) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
      const endStr = `${year}-${String(month).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
      const { data } = await supabase
        .from("schedules")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      const items = Array.isArray(data) ? data : [];
      return json({ ok: true, initialized: true, items });
    }
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const times: string[] = [];
    for (let h = 10; h <= 20; h++) {
      times.push(`${String(h).padStart(2, "0")}:00`);
    }
    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };
    const rows: any[] = [];
    for (let d = 1; d <= end.getDate(); d++) {
      const curr = new Date(year, month - 1, d);
      const day = curr.getDay();
      if (weekdaysOnly && (day === 0 || day === 6)) continue;
      const dateStr = toYMD(curr);
      for (const t of times) {
        rows.push({
          date: dateStr,
          time: t,
          max,
          current: 0,
          is_open: true,
        });
      }
    }
    const now = new Date().toISOString();
    if (rows.length > 0) {
      for (const chunk of chunkArray(rows, 100)) {
        await supabase.from("schedules").upsert(
          chunk.map((r) => ({ ...r, created_at: now, updated_at: now })),
          { onConflict: "date,time" }
        );
      }
    }
    await supabase
      .from("schedule_month_inits")
      .upsert({ year, month, key, initialized_at: now }, { onConflict: "year,month" });
    return json({ ok: true, initialized: false, created: rows.length });
  } catch {
    return json({ ok: false }, 500);
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
