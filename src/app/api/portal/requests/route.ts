import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

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

    const { error } = await supabase.from("portal_requests").insert({
      student_id: studentId,
      type,
      payload,
    });
    if (error) {
      return json({ ok: false, error: error.message }, 403);
    }

    return json({ ok: true }, 200);
  } catch {
    return json({ ok: false, error: "server_error" }, 500);
  }
}
