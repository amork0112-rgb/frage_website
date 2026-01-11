// src/app/api/admission/reserve/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) return json({ error: "unauthorized" }, 401);
    if ((user.app_metadata as any)?.role !== "parent")
      return json({ error: "forbidden" }, 403);

    const body = await req.json();
    const slotId = body?.slot_id;
    const studentId = body?.student_id;

    if (!slotId || !studentId) {
      return json({ error: "slot_id and student_id required" }, 400);
    }

    /* 1️⃣ 부모 확인 */
    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!parent) return json({ error: "no_parent" }, 400);

    /* 2️⃣ 학생 소유권 확인 */
    const { data: student } = await supabase
      .from("new_students")
      .select("id")
      .eq("id", studentId)
      .eq("parent_id", parent.id)
      .maybeSingle();

    if (!student) return json({ error: "no_new_student" }, 400);

    /* 3️⃣ 슬롯 상태 확인 */
    const { data: slot } = await supabaseService
      .from("consultation_slots")
      .select("id,date,time,max,current,is_open")
      .eq("id", slotId)
      .maybeSingle();
    if (!slot?.id) return json({ error: "slot_not_found" }, 404);
    const isClosed = slot.is_open !== true;
    const isFull = Number(slot.current ?? 0) >= Number(slot.max ?? 0);
    if (isClosed || isFull) {
      return json({ error: "slot_full_or_closed" }, 409);
    }

    /* 4️⃣ 예약 INSERT */
    const { error: insertErr } = await supabaseService
      .from("student_reservations")
      .insert({
        student_id: studentId,
        slot_id: slotId,
      });

    if (insertErr) {
      return json({ error: "reservation_failed" }, 500);
    }

    /* 5️⃣ 슬롯 current + 1 (동작 우선) */
    const nextCurrent = Number(slot.current ?? 0) + 1;
    const { error: updateErr } = await supabaseService
      .from("consultation_slots")
      .update({ current: nextCurrent })
      .eq("id", slotId);
    if (updateErr) {
      return json({ error: "slot_update_failed" }, 500);
    }

    return json({
      ok: true,
      reservation: {
        slot_id: slotId,
        student_id: studentId,
        date: String(slot.date),
        time: String(slot.time),
      },
    });
  } catch (e) {
    console.error("[reserve]", e);
    return json({ error: "server_error" }, 500);
  }
}
