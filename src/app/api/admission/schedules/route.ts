//src/app/api/admission/schedules/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return json({ items: [] });
    }

    const { data, error } = await supabaseService
      .from("consultation_slots")
      .select("id, date, time, max, current, is_open")
      .eq("date", date)
      .order("time", { ascending: true });

    if (error || !data) {
      return json({ items: [] });
    }

    const items = data
      .filter(
        (slot) =>
          slot.is_open === true &&
          Number(slot.current) < Number(slot.max)
      )
      .map((slot) => ({
        id: slot.id,
        date: slot.date,
        time: slot.time,
        max: slot.max,
        current: slot.current,
        isOpen: slot.is_open,
      }));

    return json({ items });
  } catch (e) {
    return json({ items: [] }, 500);
  }
}
