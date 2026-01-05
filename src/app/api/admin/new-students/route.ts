import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseServer, supabaseServerReady } from "@/lib/supabase/server";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET() {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id || "";
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await (supabaseServer as any).from("profiles").select("role").eq("id", uid).maybeSingle();
    const role = String(prof?.role || "");
    if (supabaseServerReady) {
      if (!prof || (role !== "admin" && role !== "teacher")) return json({ error: "forbidden" }, 403);
    }
    if (!supabaseServerReady) {
      return json({ items: [], checklists: {}, reservations: {} });
    }
    const { data: students, error: e1 } = await (supabaseServer as any)
      .from("new_students")
      .select("*")
      .order("created_at", { ascending: false });
    if (e1) return json({ error: "students_fetch_failed" }, 500);

    const { data: checkRows, error: e2 } = await (supabaseServer as any)
      .from("new_student_checklists")
      .select("*");
    if (e2) return json({ error: "checklists_fetch_failed" }, 500);

    const { data: reservations, error: e3 } = await (supabaseServer as any)
      .from("student_reservations")
      .select("student_id,slot_id");
    if (e3) return json({ error: "reservations_fetch_failed" }, 500);

    const slotIds: string[] = Array.isArray(reservations)
      ? reservations.map((r: any) => String(r.slot_id || "")).filter(Boolean)
      : [];
    const { data: slots, error: e4 } = await (supabaseServer as any)
      .from("consultation_slots")
      .select("id,date,time")
      .in("id", slotIds);
    if (e4) return json({ error: "slots_fetch_failed" }, 500);
    const slotMap: Record<string, { date: string | null; time: string | null }> = {};
    (slots || []).forEach((s: any) => {
      slotMap[String(s.id)] = { date: s?.date ?? null, time: s?.time ?? null };
    });

    const checklists: Record<string, Record<string, any>> = {};
    (checkRows || []).forEach((row: any) => {
      const sid = String(row.student_id ?? row.studentId ?? "");
      const key = String(row.key ?? "");
      if (!sid || !key) return;
      if (!checklists[sid]) checklists[sid] = {};
      checklists[sid][key] = {
        key,
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
    const filtered =
      role === "teacher"
        ? list.filter((s: any) => s.status === "waiting" || s.status === "enrolled")
        : list.filter((s: any) => s.status !== "draft");

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
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id || "";
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await (supabaseServer as any).from("profiles").select("role").eq("id", uid).maybeSingle();
    if (!prof || String(prof.role) !== "admin") return json({ error: "forbidden" }, 403);
    const body = await req.json();
    const studentId = String(body.studentId || "");
    const key = String(body.key || "");
    const checked = Boolean(body.checked ?? false);
    const checked_at = body.checked_at ?? (checked ? new Date().toISOString() : null);
    const checked_by = body.checked_by ?? null;
    if (!studentId || !key) return json({ error: "missing" }, 400);

    const { data: exists } = await (supabaseServer as any)
      .from("new_student_checklists")
      .select("*")
      .eq("student_id", studentId)
      .eq("key", key);

    if (Array.isArray(exists) && exists.length > 0) {
      await (supabaseServer as any)
        .from("new_student_checklists")
        .update({ checked, checked_at, checked_by })
        .eq("student_id", studentId)
        .eq("key", key);
    } else {
      await (supabaseServer as any)
        .from("new_student_checklists")
        .insert([{ student_id: studentId, key, checked, checked_at, checked_by }]);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "invalid" }, 400);
  }
}

export async function POST(req: Request) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id || "";
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await (supabaseServer as any).from("profiles").select("role").eq("id", uid).maybeSingle();
    if (!prof || String(prof.role) !== "admin") return json({ error: "forbidden" }, 403);
    const body = await req.json();
    const action = String(body.action || "");
    if (action === "approve") {
      const newStudentId = String(body.studentId || "");
      if (!newStudentId) return json({ error: "missing" }, 400);
      const { error: rpcErr } = await (supabaseServer as any).rpc("approve_enrollment", {
        new_student_id: newStudentId,
      });
      if (rpcErr) return json({ error: "approve_failed", details: rpcErr?.message }, 500);
      return json({ ok: true, approved: true });
    }
    return json({ error: "unsupported" }, 400);
  } catch {
    return json({ error: "invalid" }, 400);
  }
}
