// api/admin/new-students/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET() {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;
    const { data: students, error: e1 } = await supabaseService
      .from("new_students")
      .select("*")
      .order("created_at", { ascending: false });
    if (e1) return json({ error: "students_fetch_failed" }, 500);

    const { data: checkRows, error: e2 } = await supabaseService
      .from("new_student_checklists")
      .select("*");
    if (e2) return json({ error: "checklists_fetch_failed" }, 500);

    const { data: reservations, error: e3 } = await supabaseService
      .from("student_reservations")
      .select("student_id,slot_id");
    if (e3) return json({ error: "reservations_fetch_failed" }, 500);

    const slotIds: string[] = Array.isArray(reservations)
      ? reservations.map((r: any) => String(r.slot_id || "")).filter(Boolean)
      : [];
    let slots: any[] = [];
    if (slotIds.length > 0) {
      const { data, error } = await supabaseService
        .from("consultation_slots")
        .select("id,date,time")
        .in("id", slotIds);
      if (error) {
        console.error("slots_fetch_failed", error);
        return json({ error: "slots_fetch_failed" }, 500);
      }
      slots = data ?? [];
    }
    const slotMap: Record<string, { date: string | null; time: string | null }> = {};
    (slots || []).forEach((s: any) => {
      slotMap[String(s.id)] = { date: s?.date ?? null, time: s?.time ?? null };
    });

    const checklists: Record<string, Record<string, any>> = {};
    (checkRows || []).forEach((row: any) => {
      const sid = String(row.student_id ?? row.studentId ?? "");
      const key = String(row.step_key ?? row.key ?? "");
      if (!sid || !key) return;
      if (!checklists[sid]) checklists[sid] = {};
      checklists[sid][key] = {
        checked: !!row.checked,
        date: row.checked_at ?? null,
        by: row.checked_by ?? null,
      };
    });

    const reservationsMap: Record<string, any> = {};
    (reservations || []).forEach((r: any) => {
      const sid = String(r.student_id ?? r.studentId ?? "");
      const slotId = String(r.slot_id ?? r.slotId ?? "");
      if (!sid) return;
      reservationsMap[sid] = {
        slotId: slotId || null,
        date: slotId && slotMap[slotId] ? slotMap[slotId].date : null,
        time: slotId && slotMap[slotId] ? slotMap[slotId].time : null,
      };
    });

    const list = Array.isArray(students) ? students : [];
    const filtered = list.filter((s: any) => {
      const sid = String(s.id || "");
      const hasReservation = !!reservationsMap[sid];
      const isWaiting = String(s.status || "") === "waiting";
      return hasReservation || isWaiting;
    });

    return json({
      items: filtered,
      checklists,
      reservations: reservationsMap,
    });
  } catch {
    return json({ error: "unexpected" }, 500);
  }
}

export async function PUT(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;
    const body = await req.json();
    const studentId = String(body.studentId ?? body.student_id ?? "");
    const key = String(body.key ?? body.stepKey ?? body.step_key ?? "");
    const checked = Boolean(body.checked ?? false);
    if (!studentId || !key) {
      console.error("PUT /api/admin/new-students missing params", body);
      return json({ error: "missing studentId or step_key" }, 400);
    }

    const SYSTEM_TEACHER_ID = "00000000-0000-0000-0000-000000000001";
    const payload = {
      student_id: studentId,
      step_key: key,
      step_label: key,
      checked,
      checked_at: checked ? new Date().toISOString() : null,
      teacher_id: SYSTEM_TEACHER_ID,
    };

    const { error } = await supabaseService
      .from("new_student_checklists")
      .upsert(payload, { onConflict: "student_id,step_key" });
    if (error) {
      console.error("CHECKLIST UPSERT ERROR", error);
      return json({ error: error.message }, 400);
    }

    if (checked && key === "admission_confirmed") {
      const { error: stepError } = await supabaseService
        .from("new_students")
        .update({ current_step: 2, status: "step2" })
        .eq("id", studentId);
      if (stepError) {
        console.error("STEP UPDATE ERROR", stepError);
      }
    }

    console.log("[NEW_STUDENT_PROGRESS]", {
      studentId,
      stepKey: key,
      checked,
      timestamp: new Date().toISOString(),
    });

    return json({ ok: true });
  } catch {
    return json({ error: "invalid" }, 400);
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;
    const body = await req.json();
    const action = String(body.action || "");
    if (action === "approve") {
      const newStudentId = String(body.studentId || "");
      if (!newStudentId) return json({ error: "missing" }, 400);
      const { data, error: rpcErr } = await supabaseAuth.rpc("approve_enrollment", {
        new_student_id: newStudentId,
      });
      if (rpcErr) return json({ error: "approve_failed", details: rpcErr?.message }, 500);
      const payload = data && typeof data === "object" ? data : {};
      return json({ ok: true, approved: true, ...payload });
    }
    return json({ error: "unsupported" }, 400);
  } catch {
    return json({ error: "invalid" }, 400);
  }
}
