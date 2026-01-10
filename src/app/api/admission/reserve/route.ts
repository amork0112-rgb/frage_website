//api/admission/reserve
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
    /** 1️⃣ 부모 인증 (읽기 전용) */
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    /** 2️⃣ 요청값: slotId만 받음 */
    const { slotId } = await req.json();
    if (!slotId) return json({ error: "missing_slot" }, 400);

    /** 3️⃣ 부모 → 최신 new_student */
    const { data: parent } = await supabaseAuth
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!parent) return json({ error: "no_parent" }, 400);

    const { data: student } = await supabaseAuth
      .from("new_students")
      .select("id")
      .eq("parent_id", parent.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!student) return json({ error: "no_student" }, 400);

    /** 4️⃣ 슬롯 상태 확인 (시스템 권한) */
    const { data: slot } = await supabaseService
      .from("consultation_slots")
      .select("id, is_open")
      .eq("id", slotId)
      .single();

    if (!slot || slot.is_open !== true) {
      return json({ error: "slot_closed" }, 409);
    }

    /** 5️⃣ 예약 INSERT (한 슬롯 = 한 명) */
    const { error: insertErr } = await supabaseService
      .from("student_reservations")
      .insert({
        student_id: student.id,
        slot_id: slot.id,
      });

    if (insertErr) {
      // UNIQUE(slot_id) 위반 → 이미 예약됨
      if ((insertErr as any).code === "23505") {
        return json({ error: "already_reserved" }, 409);
      }
      throw insertErr;
    }

    /** 6️⃣ 슬롯 닫기 */
    await supabaseService
      .from("consultation_slots")
      .update({ is_open: false })
      .eq("id", slot.id);

    return json({
      ok: true,
      reservation: {
        studentId: student.id,
        slotId: slot.id,
      },
    });
  } catch (e) {
    console.error("reserve error", e);
    return json({ error: "reservation_failed" }, 500);
  }
}

