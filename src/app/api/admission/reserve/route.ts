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
      .maybeSingle();

    if (!parent) return json({ error: "no_parent" }, 400);

    /* 2️⃣ 신청 학생 확인 */
    const { data: student } = await supabase
      .from("new_students")
      .select("id")
      .eq("parent_id", parent.id)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (!student) return json({ error: "no_new_student" }, 400);

    /* 3️⃣ 원자적 예약 처리 (RPC) */
    const { error: rpcErr } = await supabaseService.rpc("reserve_consultation", {
      p_student_id: String(student.id),
      p_date: String(date),
      p_time: String(time),
    });
    if (rpcErr) {
      console.error("reserve_consultation rpc error", {
        error: rpcErr,
        studentId: String(student.id),
        date: String(date),
        time: String(time),
      });
      const msg = rpcErr.message || "";
      if (msg.includes("slot full") || msg.includes("closed")) {
        return json({ error: "slot_full_or_closed" }, 409);
      }
      return json({ error: "reservation_failed" }, 500);
    }

    return json({
      ok: true,
      reservation: { date, time },
    });
  } catch (e) {
    return json({ error: "server_error" }, 500);
  }
}
