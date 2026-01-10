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
    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role !== "parent") return json({ error: "forbidden" }, 403);
    const body = await req.json();
    const date = String(body?.date || "");
    const time = String(body?.time || "");
    if (!date || !time) return json({ error: "missing_params" }, 400);

    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!parent) return json({ error: "no_parent" }, 400);

    const { data: newStudent } = await supabase
      .from("new_students")
      .select("id,status")
      .eq("parent_id", String(parent.id))
      .order("created_at", { ascending: false })
      .maybeSingle();
    if (!newStudent) return json({ error: "no_new_student" }, 400);
    const studentId = String(newStudent.id);

    const { data: scheduleRows } = await supabaseService
      .from("schedules")
      .select("*")
      .eq("date", date)
      .eq("time", time)
      .limit(1);
    const schedule = Array.isArray(scheduleRows) && scheduleRows.length > 0 ? scheduleRows[0] : null;
    if (!schedule) return json({ error: "no_slot" }, 404);
    if (!Boolean(schedule.is_open ?? true)) return json({ error: "closed" }, 409);
    const max = Number(schedule.max ?? 5);
    const current = Number(schedule.current ?? 0);
    if (current >= max) return json({ error: "full" }, 409);
    await supabaseService.from("schedules").update({ current: current + 1 }).eq("id", schedule.id);

    const { data: slotRows } = await supabaseService
      .from("consultation_slots")
      .select("*")
      .eq("date", date)
      .eq("time", time)
      .limit(1);
    let slot = Array.isArray(slotRows) && slotRows.length > 0 ? slotRows[0] : null;
    if (!slot) {
      const { data: inserted } = await supabaseService
        .from("consultation_slots")
        .insert({ date, time })
        .select()
        .limit(1);
      slot = Array.isArray(inserted) && inserted.length > 0 ? inserted[0] : null;
    }
    if (!slot) return json({ error: "slot_create_failed" }, 500);

    await supabaseService
      .from("student_reservations")
      .upsert({ student_id: studentId, slot_id: String(slot.id) }, { onConflict: "student_id" });

    return json({
      ok: true,
      reservation: { studentId, date, time, slotId: String(slot.id) },
    });
  } catch {
    return json({ error: "invalid" }, 400);
  }
}
