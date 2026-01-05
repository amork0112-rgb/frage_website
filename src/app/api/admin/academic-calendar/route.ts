import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase/server";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET(req: Request) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id || "";
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await (supabaseServer as any).from("profiles").select("role").eq("id", uid).maybeSingle();
    if (!prof || String(prof.role) !== "admin") return json({ error: "forbidden" }, 403);
    const { searchParams } = new URL(req.url);
    const y = Number(searchParams.get("year"));
    const m = Number(searchParams.get("month"));
    if (!y || !m) return json({ items: [] });
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const last = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const { data } = await (supabaseServer as any)
      .from("academic_calendar")
      .select("*")
      .lte("start_date", last)
      .gte("end_date", first)
      .order("start_date", { ascending: true });
    const rows: any[] = Array.isArray(data) ? data : [];
    const items = rows.map((r) => ({
      id: String(r.id),
      title: String(r.title || ""),
      type: String(r.type || ""),
      start: String(r.start_date || ""),
      end: String(r.end_date || ""),
      campus: r.campus ? String(r.campus) : undefined,
      className: r.class_name ? String(r.class_name) : undefined,
      place: r.place ? String(r.place) : undefined,
      exposeToParent: Boolean(r.expose_to_parent ?? true),
      notify: Boolean(r.notify ?? false),
      noticeLink: r.notice_link ? String(r.notice_link) : undefined,
      createdAt: String(r.created_at || ""),
    }));
    return json({ items });
  } catch (e) {
    console.error(e);
    return json({ items: [] });
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
    const title = String(body.title || "");
    const type = String(body.type || "");
    const start_date = String(body.start_date || "");
    const end_date = String(body.end_date || "");
    const campus = body.campus ? String(body.campus) : "All";
    const class_name = body.class_name ? String(body.class_name) : null;
    const place = body.place ? String(body.place) : null;
    const expose_to_parent = Boolean(body.expose_to_parent ?? true);
    const notify = Boolean(body.notify ?? false);
    const notice_link = body.notice_link ? String(body.notice_link) : null;
    if (!title || !type || !start_date || !end_date) return json({ error: "missing" }, 400);
    if (type === "공휴일") {
      const { data: dup } = await (supabaseServer as any)
        .from("academic_calendar")
        .select("*")
        .eq("type", "공휴일")
        .eq("start_date", start_date)
        .limit(1);
      if (Array.isArray(dup) && dup.length > 0) {
        const row = dup[0];
        return json({
          item: {
            id: String(row.id),
            title,
            type,
            start: start_date,
            end: end_date,
            campus: campus ?? undefined,
            className: class_name ?? undefined,
            place: place ?? undefined,
            exposeToParent: expose_to_parent,
            notify,
            noticeLink: notice_link ?? undefined,
            createdAt: String(row.created_at || new Date().toISOString()),
          },
        });
      }
    }
    const now = new Date().toISOString();
    const { data, error } = await (supabaseServer as any)
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
      .limit(1);
    if (error) return json({ error: "insert_failed" }, 500);
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    const item = row
      ? {
          id: String(row.id),
          title: String(row.title || ""),
          type: String(row.type || ""),
          start: String(row.start_date || ""),
          end: String(row.end_date || ""),
          campus: row.campus ? String(row.campus) : undefined,
          className: row.class_name ? String(row.class_name) : undefined,
          place: row.place ? String(row.place) : undefined,
          exposeToParent: Boolean(row.expose_to_parent ?? true),
          notify: Boolean(row.notify ?? false),
          noticeLink: row.notice_link ? String(row.notice_link) : undefined,
          createdAt: String(row.created_at || now),
        }
      : null;
    return json({ item }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: "invalid" }, 400);
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
    const id = String(body.id || "");
    if (!id) return json({ error: "missing id" }, 400);
    const patch: any = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) patch.title = String(body.title);
    if (body.type !== undefined) patch.type = String(body.type);
    if (body.start_date !== undefined) patch.start_date = String(body.start_date);
    if (body.end_date !== undefined) patch.end_date = String(body.end_date);
    if (body.campus !== undefined) patch.campus = body.campus ? String(body.campus) : "All";
    if (body.class_name !== undefined) patch.class_name = body.class_name ? String(body.class_name) : null;
    if (body.place !== undefined) patch.place = body.place ? String(body.place) : null;
    if (body.expose_to_parent !== undefined) patch.expose_to_parent = Boolean(body.expose_to_parent);
    if (body.notify !== undefined) patch.notify = Boolean(body.notify);
    if (body.notice_link !== undefined) patch.notice_link = body.notice_link ? String(body.notice_link) : null;
    const { data, error } = await (supabaseServer as any)
      .from("academic_calendar")
      .update(patch)
      .eq("id", id)
      .select()
      .limit(1);
    if (error) return json({ error: "update_failed" }, 500);
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    const item = row
      ? {
          id: String(row.id),
          title: String(row.title || ""),
          type: String(row.type || ""),
          start: String(row.start_date || ""),
          end: String(row.end_date || ""),
          campus: row.campus ? String(row.campus) : undefined,
          className: row.class_name ? String(row.class_name) : undefined,
          place: row.place ? String(row.place) : undefined,
          exposeToParent: Boolean(row.expose_to_parent ?? true),
          notify: Boolean(row.notify ?? false),
          noticeLink: row.notice_link ? String(row.notice_link) : undefined,
          createdAt: String(row.created_at || ""),
        }
      : null;
    return json({ item });
  } catch (e) {
    console.error(e);
    return json({ error: "invalid" }, 400);
  }
}

export async function DELETE(req: Request) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id || "";
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await (supabaseServer as any).from("profiles").select("role").eq("id", uid).maybeSingle();
    if (!prof || String(prof.role) !== "admin") return json({ error: "forbidden" }, 403);
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return json({ error: "missing id" }, 400);
    const { error } = await (supabaseServer as any).from("academic_calendar").delete().eq("id", id);
    if (error) return json({ error: "delete_failed" }, 500);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "invalid" }, 400);
  }
}
