import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// ⭐ 핵심: Admin 권한으로 DB 접근 (RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return json({ ok: false, items: [] }, 401);
    }

    const role = user.app_metadata?.role ?? "parent";
    if (role !== "parent") {
      return json({ ok: false, items: [] }, 403);
    }

    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "");

    if (!studentId) {
      return json({ ok: true, items: [] }, 200);
    }

    const { data, error } = await supabase
      .from("v_portal_requests_with_student")
      .select(
        `
        id,
        student_id,
        student_name,
        campus,
        type,
        date_start,
        date_end,
        note,
        created_at
      `
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("GET ERROR:", error);
      return json({ ok: false, items: [] }, 200);
    }

    const rows = Array.isArray(data) ? data : [];
    const items = rows.map((row: any) => ({
      id: String(row.id ?? ""),
      type: String(row.type || "absence"),
      payload: row.note ?? null,
      date_start: row.date_start ?? null,
      date_end: row.date_end ?? null,
      time: null,
      created_at: row.created_at,
      student_id: row.student_id || "",
      student_name: row.student_name || "자녀",
      campus: row.campus || null,
    }));

    return json({ ok: true, items }, 200);
  } catch {
    return json({ ok: false, items: [] }, 200);
  }
}

export async function POST(req: Request) {
  try {
    // 🧪 빠른 확인용 로그
    console.log("SERVICE KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const supabase = createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    const role = user.app_metadata?.role ?? "parent";
    if (role !== "parent") {
      return json({ ok: false, error: "forbidden" }, 403);
    }

    const body = await req.json();
    const studentId = String(body?.studentId || "");
    const rawType = String(body?.type || "");
    const payload = body?.payload ?? null;

    if (!studentId) {
      return json({ ok: false, error: "student_id_missing" }, 400);
    }
    if (!rawType || !payload) {
      return json({ ok: false, error: "invalid_payload" }, 400);
    }

    const allowedTypes = ["absence", "early_pickup", "bus_change", "medication"];
    const type = allowedTypes.includes(rawType) ? rawType : "";
    if (!type) {
      return json({ ok: false, error: "invalid_type" }, 400);
    }

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();

    if (!student) {
      return json({ ok: false, error: "student_not_found" }, 404);
    }

    // 2️⃣ INSERT (Admin 권한)
    console.log("INSERT studentId", studentId);
    console.log("INSERT payload", payload);

    const dateStart = payload.dateStart || payload.date_start;
    const dateEnd = payload.dateEnd || payload.date_end;
    const time = payload.time;

    const { error } = await supabaseAdmin.from("portal_requests").insert({
      student_id: studentId,
      type,
      payload,
      date_start: dateStart,
      date_end: dateEnd,
      time: time,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("INSERT ERROR:", error);
      return json({ ok: false, error: error.message }, 500);
    }

    return json({ ok: true }, 200);
  } catch (e) {
    console.error("SERVER ERROR:", e);
    return json({ ok: false, error: "server_error" }, 500);
  }
}
