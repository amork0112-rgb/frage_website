import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

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
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!year || !month) return json({ items: [] });

  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const last = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const { data, error } = await supabaseService
    .from("academic_calendar")
    .select("*")
    .lte("start_date", last)
    .gte("end_date", first)
    .order("start_date");

  if (error) {
    console.error("calendar GET error:", error);
    return json({ items: [] });
  }

  return json({ items: data ?? [] });
}

/* -------------------------------------------------------
  POST
------------------------------------------------------- */
export async function POST(req: Request) {
  const body = await req.json();
  const { title, type } = body;
  const start_date: string = body.start_date;
  const end_date: string = body.end_date || body.start_date;

  if (!title || !type || !start_date) {
    return json({ error: "missing" }, 400);
  }

  // 공휴일 중복 방지
  if (type === "공휴일") {
    const { data: dup } = await supabaseService
      .from("academic_calendar")
      .select("id")
      .eq("type", "공휴일")
      .eq("start_date", start_date)
      .maybeSingle();

    if (dup) return json({ error: "duplicate_holiday" });
  }

  const { data, error } = await supabaseService
    .from("academic_calendar")
    .insert({
      ...body,
      start_date,
      end_date,
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
  const body = await req.json();
  const { id, ...patch } = body;
  if (!id) return json({ error: "missing id" }, 400);

  const start_date: string | undefined = patch.start_date;
  const end_date: string | undefined = patch.end_date || patch.start_date;

  const { data, error } = await supabaseService
    .from("academic_calendar")
    .update({ ...patch, start_date, end_date, updated_at: new Date().toISOString() })
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
  const { id } = await req.json();
  if (!id) return json({ error: "missing id" }, 400);

  const { error } = await supabaseService
    .from("academic_calendar")
    .delete()
    .eq("id", id);

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
