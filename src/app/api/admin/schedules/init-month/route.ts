// api/admin/schedules/init-month
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: Request) {
  try {
    /* ---------------------------------
       1. Supabase 서버 클라이언트 (SSR)
    --------------------------------- */
    const supabase = createSupabaseServer();

    /* ---------------------------------
       2. 인증 + admin 권한 체크
    --------------------------------- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return json({ error: "unauthorized" }, 401);

  const role = (user as any).app_metadata?.role ?? "parent";
  if (role !== "admin" && role !== "master_admin") return json({ error: "forbidden" }, 403);

    /* ---------------------------------
       3. 요청 파라미터
    --------------------------------- */
    const body = await req.json();
    const year = Number(body.year ?? 0);
    const month = Number(body.month ?? 0);
    const weekdaysOnly = body.weekdaysOnly !== false; // default true
    const max = Number(body.max ?? 5);

    if (!year || !month) {
      return json({ error: "missing_params" }, 400);
    }

    const key = `${year}-${String(month).padStart(2, "0")}`;

    /* ---------------------------------
       4. 이미 초기화된 월인지 체크
    --------------------------------- */
    const { data: initRows } = await supabase
      .from("schedule_month_inits")
      .select("*")
      .eq("year", year)
      .eq("month", month)
      .limit(1);

    const alreadyInitialized =
      Array.isArray(initRows) && initRows.length > 0;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
    const endStr = `${year}-${String(month).padStart(2, "0")}-${String(
      endDate.getDate()
    ).padStart(2, "0")}`;

    /* ---------------------------------
       5. 이미 있으면 그대로 반환
    --------------------------------- */
    if (alreadyInitialized) {
      const { data: items } = await supabase
        .from("schedules")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      return json({
        ok: true,
        initialized: true,
        items: items ?? [],
      });
    }

    /* ---------------------------------
       6. 스케줄 생성
    --------------------------------- */
    const times: string[] = [];
    for (let h = 10; h <= 20; h++) {
      times.push(`${String(h).padStart(2, "0")}:00`);
    }

    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    const rows: any[] = [];

    for (let d = 1; d <= endDate.getDate(); d++) {
      const curr = new Date(year, month - 1, d);
      const day = curr.getDay(); // 0=Sun, 6=Sat

      if (weekdaysOnly && (day === 0 || day === 6)) continue;

      const dateStr = toYMD(curr);

      for (const t of times) {
        rows.push({
          date: dateStr,
          time: t,
          max,
          current: 0,
          is_open: true,
        });
      }
    }

    const now = new Date().toISOString();

    /* ---------------------------------
       7. 대량 upsert (chunk)
    --------------------------------- */
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      await supabase.from("schedules").upsert(
        chunk.map((r) => ({
          ...r,
          created_at: now,
          updated_at: now,
        })),
        { onConflict: "date,time" }
      );
    }

    /* ---------------------------------
       8. 월 초기화 기록
    --------------------------------- */
    await supabase.from("schedule_month_inits").upsert(
      {
        year,
        month,
        key,
        initialized_at: now,
      },
      { onConflict: "year,month" }
    );

    return json({
      ok: true,
      initialized: false,
      created: rows.length,
    });
  } catch (e) {
    return json({ error: "unexpected" }, 500);
  }
}
