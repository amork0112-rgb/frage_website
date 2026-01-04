import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET() {
  try {
    const { data: students, error: e1 } = await (supabase as any)
      .from("new_students")
      .select("*")
      .order("created_at", { ascending: false });
    if (e1) return json({ error: "students_fetch_failed" }, 500);

    const { data: checkRows, error: e2 } = await (supabase as any)
      .from("new_student_checklists")
      .select("*");
    if (e2) return json({ error: "checklists_fetch_failed" }, 500);

    const { data: reservations, error: e3 } = await (supabase as any)
      .from("student_reservations")
      .select("*");
    if (e3) return json({ error: "reservations_fetch_failed" }, 500);

    const checklists: Record<string, Record<string, any>> = {};
    (checkRows || []).forEach((row: any) => {
      const sid = String(row.student_id ?? row.studentId ?? "");
      const key = String(row.key ?? "");
      if (!sid || !key) return;
      if (!checklists[sid]) checklists[sid] = {};
      checklists[sid][key] = {
        key,
        checked: !!row.checked,
        date: row.date ?? null,
        by: row.by ?? null,
      };
    });

    const reservationsMap: Record<string, any> = {};
    (reservations || []).forEach((r: any) => {
      const sid = String(r.student_id ?? r.studentId ?? "");
      if (!sid) return;
      reservationsMap[sid] = {
        date: r.date ?? null,
        time: r.time ?? null,
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
    const body = await req.json();
    const studentId = String(body.studentId || "");
    const key = String(body.key || "");
    const checked = Boolean(body.checked ?? false);
    const date = body.date ?? (checked ? new Date().toISOString() : null);
    const by = body.by ?? null;
    if (!studentId || !key) return json({ error: "missing" }, 400);

    const { data: exists } = await (supabase as any)
      .from("new_student_checklists")
      .select("*")
      .eq("student_id", studentId)
      .eq("key", key);

    if (Array.isArray(exists) && exists.length > 0) {
      await (supabase as any)
        .from("new_student_checklists")
        .update({ checked, date, by })
        .eq("student_id", studentId)
        .eq("key", key);
    } else {
      await (supabase as any)
        .from("new_student_checklists")
        .insert([{ student_id: studentId, key, checked, date, by }]);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "invalid" }, 400);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action || "");
    if (action === "update_status") {
      const studentId = String(body.studentId || "");
      const status = String(body.status || "");
      if (!studentId || !status) return json({ error: "missing" }, 400);
      await (supabase as any)
        .from("new_students")
        .update({ status })
        .eq("id", studentId);
      return json({ ok: true });
    }
    return json({ error: "unsupported" }, 400);
  } catch {
    return json({ error: "invalid" }, 400);
  }
}
