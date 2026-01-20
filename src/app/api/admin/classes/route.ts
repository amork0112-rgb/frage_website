export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

type ClassRow = {
  id: string;
  name: string;
  campus: string;
  default_pickup_slot?: string | null;
  default_dropoff_slot?: string | null;
  has_transport?: boolean;
};

type ClassScheduleRow = {
  id: string;
  class_id: string;
  start_time: string;
  end_time: string;
  dajim_end_time?: string | null;
  created_at?: string;
};

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

 

export async function GET(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if (guard.error) return guard.error;

    const { data, error } = await supabaseService
      .from("v_classes_with_schedules")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return json({ items: [] }, 500);
    }

    const items = data || [];

    return json({ items }, 200);
  } catch (e) {
    console.error(e);
    return json({ items: [] }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if (guard.error) return guard.error;

    const body = await req.json();
    const name = String(body?.name || "");
    const campus = String(body?.campus || "All");
    const default_pickup_slot = body?.default_pickup_slot ?? null;
    const default_dropoff_slot = body?.default_dropoff_slot ?? null;
    const has_transport = Boolean(body?.has_transport ?? false);
    const schedule = body?.schedule || null;

    if (!name) return json({ error: "missing_name" }, 400);

    const { data: existingClass } = await supabaseService
      .from("classes")
      .select("id")
      .eq("name", name)
      .eq("campus", campus)
      .maybeSingle();
    let cls = existingClass || null;
    if (!cls) {
      const { data: created, error: insertErr } = await supabaseService
        .from("classes")
        .insert({
          name,
          campus,
          default_pickup_slot,
          default_dropoff_slot,
          has_transport,
        })
        .select()
        .maybeSingle();
      if (insertErr || !created) return json({ error: "class_insert_failed" }, 500);
      cls = created;
    } else {
      await supabaseService
        .from("classes")
        .update({
          default_pickup_slot,
          default_dropoff_slot,
          has_transport,
        })
        .eq("id", cls.id);
    }

    if (!cls) return json({ error: "class_not_found" }, 500);

    let createdSchedule: any = null;
    if (schedule && schedule.start_time && schedule.end_time) {
      const now = new Date().toISOString();
      const { data: existingSched } = await supabaseService
        .from("class_schedules")
        .select("id")
        .eq("class_id", cls.id)
        .maybeSingle();
      if (existingSched?.id) {
        const { data: schedRow, error: schedUpdateErr } = await supabaseService
          .from("class_schedules")
          .update({
            class_start_time: String(schedule.start_time),
            class_end_time: String(schedule.end_time),
            dajim_end_time: schedule.dajim_end_time ?? null,
            weekdays: schedule.weekdays ?? null,
          })
          .eq("id", existingSched.id)
          .select()
          .maybeSingle();
        if (schedUpdateErr) return json({ error: "schedule_update_failed", class: cls }, 500);
        createdSchedule = schedRow;
      } else {
        const { data: schedRow, error: schedInsertErr } = await supabaseService
          .from("class_schedules")
          .insert({
            class_id: cls.id,
            class_start_time: String(schedule.start_time),
            class_end_time: String(schedule.end_time),
            dajim_end_time: schedule.dajim_end_time ?? null,
            weekdays: schedule.weekdays ?? null,
            created_at: now,
          })
          .select()
          .maybeSingle();
        if (schedInsertErr) return json({ error: "schedule_insert_failed", class: cls }, 500);
        createdSchedule = schedRow;
      }
    }

    return json({ ok: true, class: cls, schedule: createdSchedule }, 200);
  } catch (e) {
    console.error(e);
    return json({ error: "server_error" }, 500);
  }
}
