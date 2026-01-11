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
    const slotId: string | null = body?.slot_id ? String(body.slot_id) : null;
    const providedStudentId: string | null = body?.student_id ? String(body.student_id) : null;
    if (!slotId || !providedStudentId) {
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
    const { data: studentRow } = await supabase
      .from("new_students")
      .select("id")
      .eq("id", providedStudentId)
      .eq("parent_id", parent.id)
      .maybeSingle();
    if (!studentRow?.id) return json({ error: "no_new_student" }, 400);

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

    /* 4️⃣ 예약 생성 또는 갱신 */
    const { error: upsertErr } = await supabaseService
      .from("student_reservations")
      .upsert([{ slot_id: slotId, student_id: providedStudentId }], { onConflict: "student_id" });
    if (upsertErr) return json({ error: "reservation_failed" }, 500);

    /* 5️⃣ 슬롯 인원 증가 (동작 우선: read-modify-write) */
    const nextCurrent = Number(slot.current ?? 0) + 1;
    const { error: updateErr } = await supabaseService
      .from("consultation_slots")
      .update({ current: nextCurrent })
      .eq("id", slotId);
    if (updateErr) return json({ error: "slot_update_failed" }, 500);

    return json({
      ok: true,
      reservation: { date: String(slot.date), time: String(slot.time), slotId, studentId: providedStudentId },
    });
  } catch (e) {
    return json({ error: "server_error" }, 500);
  }
}
