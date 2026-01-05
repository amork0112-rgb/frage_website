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
    const { searchParams } = new URL(req.url);
    const y = Number(searchParams.get("year"));
    const m = Number(searchParams.get("month"));
    if (!y || !m) return json({ items: [] });
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const last = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    let campusVal: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id || null;
      if (uid) {
        const { data: prof } = await (supabaseServer as any)
          .from("profiles")
          .select("role,campus")
          .eq("id", uid)
          .maybeSingle();
        const role = prof?.role ? String(prof.role) : "";
        if (role !== "parent") return json({ error: "forbidden" }, 403);
        campusVal = prof?.campus ? String(prof.campus) : null;
      }
    } catch {}
    let q = (supabase as any)
      .from("academic_calendar")
      .select("*")
      .eq("expose_to_parent", true)
      .lte("start_date", last)
      .gte("end_date", first);
    if (campusVal) {
      q = q.or(`campus.eq.All,campus.eq.${campusVal}`);
    } else {
      q = q.eq("campus", "All");
    }
    const { data } = await q.order("start_date", { ascending: true });
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
