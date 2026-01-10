//src/app/api/admission/schedules/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * GET /api/admission/schedules?date=YYYY-MM-DD
 *
 * 동작:
 * 1. 해당 날짜에 consultation_slots 이 이미 있으면 그대로 반환
 * 2. 없고 평일이면 → 기본 11개 슬롯(10:00~20:00) 자동 생성
 * 3. is_open=true && current < max 인 슬롯만 반환
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return json({ items: [] });
    }

    /* ---------------------------------
       1️⃣ 기존 슬롯 존재 여부 확인
    ---------------------------------- */
    const { data: existingSlots, error: checkError } =
      await supabaseService
        .from("consultation_slots")
        .select("id")
        .eq("date", date)
        .limit(1);

    if (checkError) {
      return json({ items: [] }, 500);
    }

    /* ---------------------------------
       2️⃣ 슬롯이 없으면 자동 생성 (평일만)
    ---------------------------------- */
    if (!existingSlots || existingSlots.length === 0) {
      const day = new Date(date).getDay(); // 0=일, 6=토

      // 주말이면 생성 안 함
      if (day !== 0 && day !== 6) {
        const baseTimes = [
          "10:00",
          "11:00",
          "12:00",
          "13:00",
          "14:00",
          "15:00",
          "16:00",
          "17:00",
          "18:00",
          "19:00",
          "20:00",
        ];

        const rows = baseTimes.map((time) => ({
          date,
          time,
          max: 1,
          current: 0,
          is_open: true,
        }));

        await supabaseService
          .from("consultation_slots")
          .insert(rows);
      }
    }

    /* ---------------------------------
       3️⃣ 슬롯 조회 (허용 슬롯만)
    ---------------------------------- */
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
