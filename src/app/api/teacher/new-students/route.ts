import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    
    // 1. Teacher Check (DB Source of Truth)
    const { data: teacher, error: teacherError } = await supabaseService
      .from("teachers")
      .select("id, role, campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (teacherError) {
      console.error("❌ teachers query failed", teacherError);
      return json({ error: "Teacher query error" }, 500);
    }

    if (!teacher) {
      return json({ error: "forbidden" }, 403);
    }

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
      if (error) return json({ error: "slots_fetch_failed" }, 500);
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

    return json({
      items: Array.isArray(students) ? students : [],
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
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    
    // 1. Teacher Check (DB Source of Truth)
    const { data: teacher } = await supabaseService
      .from("teachers")
      .select("id, role, campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!teacher) {
      return json({ error: "forbidden" }, 403);
    }
    
    const body = await req.json();
    const { studentId, key, checked } = body;
    if (!studentId || !key) return json({ error: "bad_request" }, 400);

    const now = new Date().toISOString();
    
    // Use supabaseService to write
    if (checked) {
      const { error } = await supabaseService
        .from("new_student_checklists")
        .upsert({
          student_id: studentId,
          step_key: key,
          checked: true,
          checked_at: now,
          checked_by: user.id, // Keep user ID for audit, or use teacher.id
        }, { onConflict: "student_id,step_key" });
      if (error) return json({ error: "upsert_failed" }, 500);
    } else {
      const { error } = await supabaseService
        .from("new_student_checklists")
        .delete()
        .eq("student_id", studentId)
        .eq("step_key", key);
      if (error) return json({ error: "delete_failed" }, 500);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "unexpected" }, 500);
  }
}
