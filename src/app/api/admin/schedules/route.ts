import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const date = searchParams.get("date");
  const start = searchParams.get("rangeStart");
  const end = searchParams.get("rangeEnd");
  try {
    let query = supabase.from("schedules").select("*");
    if (yearParam && monthParam) {
      const year = Number(yearParam);
      const month = Number(monthParam);
      if (!year || !month) return json({ error: "invalid_params" }, 400);
      const first = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const last = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const { data } = await query
        .gte("date", first)
        .lte("date", last)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      const rows: any[] = Array.isArray(data) ? data : [];
      const days: Record<string, { isOpen: boolean; slots: { time: string; max: number; current: number }[] }> = {};
      let totalSlots = 0;
      let reservedSlots = 0;
      rows.forEach((r: any) => {
        const dateStr = String(r.date);
        const slot = { time: String(r.time), max: Number(r.max ?? 5), current: Number(r.current ?? 0) };
        (days[dateStr] ||= { isOpen: false, slots: [] }).slots.push(slot);
        if (Boolean(r.is_open ?? true)) days[dateStr].isOpen = true;
        totalSlots += 1;
        reservedSlots += slot.current;
      });
      const openDays = Object.values(days).filter((d) => d.isOpen).length;
      const totalDays = lastDay;
      return json({
        year,
        month,
        days,
        summary: { totalDays, openDays, totalSlots, reservedSlots },
      });
    }
    if (date) {
      const { data } = await query.eq("date", date).order("time", { ascending: true });
      const items = Array.isArray(data) ? data.map((r: any) => ({
        id: String(r.id),
        date: String(r.date),
        time: String(r.time),
        max: Number(r.max ?? 5),
        current: Number(r.current ?? 0),
        isOpen: Boolean(r.is_open ?? true),
        note: r.note ? String(r.note) : undefined,
      })) : [];
      return json({ items });
    }
    if (start && end) {
      const { data } = await query.gte("date", start).lte("date", end).order("date", { ascending: true }).order("time", { ascending: true });
      const items = Array.isArray(data) ? data.map((r: any) => ({
        id: String(r.id),
        date: String(r.date),
        time: String(r.time),
        max: Number(r.max ?? 5),
        current: Number(r.current ?? 0),
        isOpen: Boolean(r.is_open ?? true),
        note: r.note ? String(r.note) : undefined,
      })) : [];
      return json({ items });
    }
    const { data } = await query.order("date", { ascending: true }).order("time", { ascending: true });
    const items = Array.isArray(data) ? data.map((r: any) => ({
      id: String(r.id),
      date: String(r.date),
      time: String(r.time),
      max: Number(r.max ?? 5),
      current: Number(r.current ?? 0),
      isOpen: Boolean(r.is_open ?? true),
      note: r.note ? String(r.note) : undefined,
    })) : [];
    return json({ items });
  } catch {
    return json({ items: [] });
  }
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
    const { data: dupRows } = await supabase
      .from("schedules")
      .select("*")
      .eq("date", date)
      .eq("time", time)
      .limit(1);
    const dup = Array.isArray(dupRows) && dupRows.length > 0 ? dupRows[0] : null;
    if (dup) {
      return json({
        item: {
          id: String(dup.id),
          date: String(dup.date),
          time: String(dup.time),
          max: Number(dup.max ?? 5),
          current: Number(dup.current ?? 0),
          isOpen: Boolean(dup.is_open ?? true),
          note: dup.note ? String(dup.note) : undefined,
        }
      }, 200);
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("schedules")
      .insert({
        date,
        time,
        max,
        current,
        is_open: isOpen,
        created_at: now,
        updated_at: now,
      })
      .select()
      .limit(1);
    if (error) {
      return json({ error: "insert_failed" }, 500);
    }
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    const item = row ? {
      id: String(row.id),
      date: String(row.date),
      time: String(row.time),
      max: Number(row.max ?? 5),
      current: Number(row.current ?? 0),
      isOpen: Boolean(row.is_open ?? true),
      note: row.note ? String(row.note) : undefined,
    } : null;
    return json({ item }, 201);
  } catch {
    return json({ error: "invalid" }, 400);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return json({ error: "missing id" }, 400);
    const now = new Date().toISOString();
    const patch: any = { updated_at: now };
    if (body.date !== undefined) patch.date = String(body.date);
    if (body.time !== undefined) patch.time = String(body.time);
    if (typeof body.max === "number") patch.max = body.max;
    if (typeof body.current === "number") patch.current = body.current;
    if (typeof body.isOpen === "boolean") patch.is_open = body.isOpen;
    if (body.note !== undefined) patch.note = body.note ? String(body.note) : null;
    // If changing date/time, ensure no duplication; but be idempotent: return existing instead of 409
    if (patch.date || patch.time) {
      const dateVal = patch.date ?? undefined;
      const timeVal = patch.time ?? undefined;
      if (dateVal && timeVal) {
        const { data: dupRows } = await supabase
          .from("schedules")
          .select("*")
          .eq("date", dateVal)
          .eq("time", timeVal)
          .neq("id", id)
          .limit(1);
        const dup = Array.isArray(dupRows) && dupRows.length > 0 ? dupRows[0] : null;
        if (dup) {
          return json({
            item: {
              id: String(dup.id),
              date: String(dup.date),
              time: String(dup.time),
              max: Number(dup.max ?? 5),
              current: Number(dup.current ?? 0),
              isOpen: Boolean(dup.is_open ?? true),
              note: dup.note ? String(dup.note) : undefined,
            }
          }, 200);
        }
      }
    }
    const { data, error } = await supabase
      .from("schedules")
      .update(patch)
      .eq("id", id)
      .select()
      .limit(1);
    if (error) return json({ error: "update_failed" }, 500);
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    const item = row ? {
      id: String(row.id),
      date: String(row.date),
      time: String(row.time),
      max: Number(row.max ?? 5),
      current: Number(row.current ?? 0),
      isOpen: Boolean(row.is_open ?? true),
      note: row.note ? String(row.note) : undefined,
    } : null;
    return json({ item });
  } catch {
    return json({ error: "invalid" }, 400);
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return json({ error: "missing id" }, 400);
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) return json({ error: "delete_failed" }, 500);
    return json({ ok: true });
  } catch {
    return json({ error: "invalid" }, 400);
  }
}
