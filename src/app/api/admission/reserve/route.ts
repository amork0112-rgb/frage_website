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

    const { date, time } = await req.json();
    if (!date || !time) return json({ error: "missing_params" }, 400);

    /* 1️⃣ 부모 확인 */
    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!parent) return json({ error: "no_parent" }, 400);

    /* 2️⃣ 신청 학생 확인 */
    const { data: student } = await supabase
      .from("new_students")
      .select("id")
      .eq("parent_id", parent.id)
      .order("created_at", { ascending: false })
      .single();

    if (!student) return json({ error: "no_new_student" }, 400);

    /* 3️⃣ 이미 예약된 슬롯인지 확인 (한 슬롯 = 한 명) */
    const { data: existingSlot } = await supabaseService
      .from("consultation_slots")
      .select("id")
      .eq("date", date)
      .eq("time", time)
      .maybeSingle();

    if (existingSlot) {
      return json({ error: "slot_already_reserved" }, 409);
    }

    /* 4️⃣ 슬롯 생성 */
    const { data: slot, error: slotErr } = await supabaseService
      .from("consultation_slots")
      .insert({ date, time })
      .select()
      .single();

    if (slotErr || !slot) {
      return json({ error: "slot_create_failed" }, 500);
    }

    /* 5️⃣ 예약 생성 */
    await supabaseService.from("student_reservations").insert({
      student_id: student.id,
      slot_id: slot.id,
    });

    return json({
      ok: true,
      reservation: { date, time },
    });
  } catch (e) {
    return json({ error: "server_error" }, 500);
  }
}
