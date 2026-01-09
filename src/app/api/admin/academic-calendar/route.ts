import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

/* -------------------------------------------------------
  공통 JSON 응답
------------------------------------------------------- */
const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/* -------------------------------------------------------
  Admin 인증
------------------------------------------------------- */
 

/* -------------------------------------------------------
  GET
------------------------------------------------------- */
export async function GET(req: Request) {
  const supabase = createSupabaseServer();
  const guard = await requireAdmin(supabase);
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!year || !month) return json({ items: [] });

  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const last = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const { data, error } = await supabase
    .from("academic_calendar")
    .select("*")
    .lte("start_date", last)
    .gte("end_date", first)
    .order("start_date");

  if (error) return json({ items: [] });

  return json({ items: data ?? [] });
}

/* -------------------------------------------------------
  POST
------------------------------------------------------- */
export async function POST(req: Request) {
  const supabase = createSupabaseServer();
  const guard = await requireAdmin(supabase);
  if (guard.error) return guard.error;

  const body = await req.json();
  const { title, type, start_date, end_date } = body;

  if (!title || !type || !start_date || !end_date) {
    return json({ error: "missing" }, 400);
  }

  // 공휴일 중복 방지
  if (type === "공휴일") {
    const { data: dup } = await supabase
      .from("academic_calendar")
      .select("id")
      .eq("type", "공휴일")
      .eq("start_date", start_date)
      .maybeSingle();

    if (dup) return json({ error: "duplicate_holiday" });
  }

  const { data, error } = await supabase
    .from("academic_calendar")
    .insert({
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ item: data }, 201);
}

/* -------------------------------------------------------
  PUT
------------------------------------------------------- */
export async function PUT(req: Request) {
  const supabase = createSupabaseServer();
  const guard = await requireAdmin(supabase);
  if (guard.error) return guard.error;

  const body = await req.json();
  const { id, ...patch } = body;
  if (!id) return json({ error: "missing id" }, 400);

  const { data, error } = await supabase
    .from("academic_calendar")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ item: data });
}

/* -------------------------------------------------------
  DELETE
------------------------------------------------------- */
export async function DELETE(req: Request) {
  const supabase = createSupabaseServer();
  const guard = await requireAdmin(supabase);
  if (guard.error) return guard.error;

  const { id } = await req.json();
  if (!id) return json({ error: "missing id" }, 400);

  const { error } = await supabase
    .from("academic_calendar")
    .delete()
    .eq("id", id);

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
