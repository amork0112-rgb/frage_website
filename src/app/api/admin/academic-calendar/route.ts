import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer, supabaseServerReady } from "@/lib/supabase/server";

/* -------------------------------------------------------
  공통 JSON 응답
------------------------------------------------------- */
const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/* -------------------------------------------------------
  Admin 인증 (쿠키 기반 auth + role 체크)
------------------------------------------------------- */
async function requireAdmin() {
  console.log("🔥 supabaseServerReady:", supabaseServerReady);

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookies().get(key)?.value,
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser();

  if (error || !user) {
    return { error: json({ error: "unauthorized" }, 401) };
  }

  if (user.app_metadata?.role !== "admin") {
    return { error: json({ error: "forbidden" }, 403) };
  }

  return { user };
}

/* -------------------------------------------------------
  GET : 월별 학사일정 조회
------------------------------------------------------- */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!year || !month) return json({ items: [] });

    const first = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const last = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { data, error } = await supabaseServer
      .from("academic_calendar")
      .select("*")
      .lte("start_date", last)
      .gte("end_date", first)
      .order("start_date", { ascending: true });

    if (error) {
      console.error(error);
      return json({ items: [] });
    }

    const items = (data ?? []).map((r: any) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      type: String(r.type ?? ""),
      start: String(r.start_date ?? ""),
      end: String(r.end_date ?? ""),
      campus: r.campus ?? undefined,
      className: r.class_name ?? undefined,
      place: r.place ?? undefined,
      exposeToParent: Boolean(r.expose_to_parent ?? true),
      notify: Boolean(r.notify ?? false),
      noticeLink: r.notice_link ?? undefined,
      createdAt: String(r.created_at ?? ""),
    }));

    return json({ items });
  } catch (e) {
    console.error(e);
    return json({ items: [] });
  }
}

/* -------------------------------------------------------
  POST : 학사일정 추가
------------------------------------------------------- */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json();

    const title = String(body.title || "");
    const type = String(body.type || "");
    const start_date = String(body.start_date || "");
    const end_date = String(body.end_date || "");

    if (!title || !type || !start_date || !end_date) {
      return json({ error: "missing" }, 400);
    }

    // 공휴일 중복 방지
    if (type === "공휴일") {
      const { data: dup } = await supabaseServer
        .from("academic_calendar")
        .select("id")
        .eq("type", "공휴일")
        .eq("start_date", start_date)
        .maybeSingle();

      if (dup) {
        return json({ error: "duplicate_holiday" }, 200);
      }
    }

    const now = new Date().toISOString();

    const { data, error } = await supabaseServer
      .from("academic_calendar")
      .insert({
        title,
        type,
        start_date,
        end_date,
        campus: body.campus ?? "All",
        class_name: body.class_name ?? null,
        place: body.place ?? null,
        expose_to_parent: Boolean(body.expose_to_parent ?? true),
        notify: Boolean(body.notify ?? false),
        notice_link: body.notice_link ?? null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return json({ error: "insert_failed" }, 500);
    }

    return json({ item: data }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: "invalid" }, 400);
  }
}

/* -------------------------------------------------------
  PUT : 학사일정 수정
------------------------------------------------------- */
export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return json({ error: "missing id" }, 400);

    const patch = { ...body, updated_at: new Date().toISOString() };
    delete patch.id;

    const { data, error } = await supabaseServer
      .from("academic_calendar")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(error);
      return json({ error: "update_failed" }, 500);
    }

    return json({ item: data });
  } catch (e) {
    console.error(e);
    return json({ error: "invalid" }, 400);
  }
}

/* -------------------------------------------------------
  DELETE : 학사일정 삭제
------------------------------------------------------- */
export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { id } = await req.json();
    if (!id) return json({ error: "missing id" }, 400);

    const { error } = await supabaseServer
      .from("academic_calendar")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      return json({ error: "delete_failed" }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "invalid" }, 400);
  }
}
