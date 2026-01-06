import { NextResponse } from "next/server";
import {
  supabaseServer,
  supabaseServerReady,
} from "@/lib/supabase/server";

/* -------------------------------------------------------
  공통 JSON 헬퍼
------------------------------------------------------- */
const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/* -------------------------------------------------------
  공통: admin 가드 (JWT 기준)
------------------------------------------------------- */
async function requireAdmin() {
  console.log("🔥 supabaseServerReady:", supabaseServerReady);

  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return { error: json({ error: "unauthorized" }, 401) };
  }

  if (user.app_metadata?.role !== "admin") {
    return { error: json({ error: "forbidden" }, 403) };
  }

  return { user };
}

/* -------------------------------------------------------
  GET : 월별 일정 조회
------------------------------------------------------- */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!year || !month) {
      return json({ items: [] });
    }

    const first = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const last = `${year}-${String(month).padStart(2, "0")}-${String(
      lastDay
    ).padStart(2, "0")}`;

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

    const items =
      Array.isArray(data) &&
      data.map((r: any) => ({
        id: String(r.id),
        title: String(r.title ?? ""),
        type: String(r.type ?? ""),
        start: String(r.start_date ?? ""),
        end: String(r.end_date ?? ""),
        campus: r.campus ? String(r.campus) : undefined,
        className: r.class_name ? String(r.class_name) : undefined,
        place: r.place ? String(r.place) : undefined,
        exposeToParent: Boolean(r.expose_to_parent ?? true),
        notify: Boolean(r.notify ?? false),
        noticeLink: r.notice_link ? String(r.notice_link) : undefined,
        createdAt: String(r.created_at ?? ""),
      }));

    return json({ items });
  } catch (e) {
    console.error(e);
    return json({ items: [] });
  }
}

/* -------------------------------------------------------
  POST : 일정 추가
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

    const campus = body.campus ? String(body.campus) : "All";
    const class_name = body.class_name ? String(body.class_name) : null;
    const place = body.place ? String(body.place) : null;
    const expose_to_parent = Boolean(body.expose_to_parent ?? true);
    const notify = Boolean(body.notify ?? false);
    const notice_link = body.notice_link ? String(body.notice_link) : null;

    /* 공휴일 중복 방지 */
    if (type === "공휴일") {
      const { data: dup } = await supabaseServer
        .from("academic_calendar")
        .select("*")
        .eq("type", "공휴일")
        .eq("start_date", start_date)
        .maybeSingle();

      if (dup) {
        return json({
          item: {
            id: String(dup.id),
            title: String(dup.title),
            type: String(dup.type),
            start: String(dup.start_date),
            end: String(dup.end_date),
            campus: dup.campus ?? undefined,
            className: dup.class_name ?? undefined,
            place: dup.place ?? undefined,
            exposeToParent: Boolean(dup.expose_to_parent ?? true),
            notify: Boolean(dup.notify ?? false),
            noticeLink: dup.notice_link ?? undefined,
            createdAt: String(dup.created_at),
          },
        });
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
        campus,
        class_name,
        place,
        expose_to_parent,
        notify,
        notice_link,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return json({ error: "insert_failed" }, 500);
    }

    return json(
      {
        item: {
          id: String(data.id),
          title: String(data.title),
          type: String(data.type),
          start: String(data.start_date),
          end: String(data.end_date),
          campus: data.campus ?? undefined,
          className: data.class_name ?? undefined,
          place: data.place ?? undefined,
          exposeToParent: Boolean(data.expose_to_parent ?? true),
          notify: Boolean(data.notify ?? false),
          noticeLink: data.notice_link ?? undefined,
          createdAt: String(data.created_at),
        },
      },
      201
    );
  } catch (e) {
    console.error(e);
    return json({ error: "invalid" }, 400);
  }
}

/* -------------------------------------------------------
  PUT : 일정 수정
------------------------------------------------------- */
export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return json({ error: "missing id" }, 400);

    const patch: any = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) patch.title = String(body.title);
    if (body.type !== undefined) patch.type = String(body.type);
    if (body.start_date !== undefined)
      patch.start_date = String(body.start_date);
    if (body.end_date !== undefined) patch.end_date = String(body.end_date);
    if (body.campus !== undefined)
      patch.campus = body.campus ? String(body.campus) : "All";
    if (body.class_name !== undefined)
      patch.class_name = body.class_name
        ? String(body.class_name)
        : null;
    if (body.place !== undefined)
      patch.place = body.place ? String(body.place) : null;
    if (body.expose_to_parent !== undefined)
      patch.expose_to_parent = Boolean(body.expose_to_parent);
    if (body.notify !== undefined) patch.notify = Boolean(body.notify);
    if (body.notice_link !== undefined)
      patch.notice_link = body.notice_link
        ? String(body.notice_link)
        : null;

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
  DELETE : 일정 삭제
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
