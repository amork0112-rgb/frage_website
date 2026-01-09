import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getKoreanHolidays } from "@/lib/holidays";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ((guard as any).error) return (guard as any).error;
    const body = await req.json();
    const year = Number(body.year || 0);
    if (!year) return json({ error: "missing_year" }, 400);
    const events = getKoreanHolidays(year);
    let inserted = 0;
    for (const ev of events) {
      const { data: dup } = await supabaseAuth
        .from("academic_calendar")
        .select("id")
        .eq("type", "공휴일")
        .eq("start_date", ev.start)
        .limit(1);
      const exists = Array.isArray(dup) && dup.length > 0;
      if (exists) continue;
      const now = new Date().toISOString();
      const { error } = await supabaseAuth
        .from("academic_calendar")
        .insert({
          title: ev.title,
          type: "공휴일",
          start_date: ev.start,
          end_date: ev.end,
          campus: "All",
          class_name: null,
          place: null,
          expose_to_parent: ev.exposeToParent ?? true,
          notify: false,
          notice_link: null,
          created_at: now,
          updated_at: now,
        });
      if (!error) inserted++;
    }
    return json({ ok: true, inserted });
  } catch (e) {
    console.error(e);
    return json({ error: "invalid" }, 400);
  }
}
