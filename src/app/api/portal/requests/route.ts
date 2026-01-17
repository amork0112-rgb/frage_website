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

    // ⭐ GET은 읽기이므로, RLS가 적용된 일반 client 사용 (안전)
    const { data, error } = await supabase
      .from("portal_requests")
      .select("id,type,payload,created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      return json({ ok: false, items: [] }, 200);
    }

    const rows = Array.isArray(data) ? data : [];
    const items = rows.map((row: any) => ({
      id: String(row.id ?? ""),
      date: String(row?.payload?.dateStart || row?.created_at || ""),
      type: String(row.type || "absence"),
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

    if (!studentId || !rawType || !payload) {
      return json({ ok: false, error: "invalid_payload" }, 400);
    }

    const allowedTypes = ["absence", "early_pickup", "bus_change", "medication"];
    const type = allowedTypes.includes(rawType) ? rawType : "";
    if (!type) {
      return json({ ok: false, error: "invalid_type" }, 400);
    }

    // 1️⃣ 학생 존재 검증 (Admin 권한)
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();

    if (!student) {
      return json({ ok: false, error: "student_not_found" }, 404);
    }

    // 2️⃣ INSERT (Admin 권한)
    // payload에서 날짜 등 필요한 정보 추출하여 컬럼에 매핑 가능하지만,
    // 현재 스키마는 jsonb payload를 사용하는 것으로 보임.
    // 사용자가 제공한 구조대로 date_start 등을 풀어서 넣을 수도 있지만,
    // 기존 로직(payload 통째로 + 필요한 컬럼 추출)을 유지하되 Admin 사용.
    
    // payload 내부 값 추출 (사용자 요청 예시 반영)
    const dateStart = payload.dateStart || payload.date_start;
    const dateEnd = payload.dateEnd || payload.date_end;
    const time = payload.time;

    const { error } = await supabaseAdmin.from("portal_requests").insert({
      student_id: studentId,
      type,
      payload,
      // 필요한 경우 추가 컬럼 매핑 (스키마에 존재한다면)
      // date_start: dateStart,
      // date_end: dateEnd,
      // time: time,
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
