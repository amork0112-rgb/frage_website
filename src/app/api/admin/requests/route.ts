import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const guard = await requireAdmin(supabase);
    if ((guard as any).error) return (guard as any).error;

    const body = await req.json();
    const name = String(body?.name || "");
    const phone = String(body?.phone || "");
    const source = String(body?.source || "call");
    const status = String(body?.status || "draft");

    const payload = {
      name,
      phone,
      source,
      status,
    };

    const { error } = await supabase.from("portal_requests").insert(payload);
    if (error) {
      console.error("REQUEST INSERT ERROR", error);
      return json({ ok: false, error: error.message }, 500);
    }
    return json({ ok: true }, 200);
  } catch (e: any) {
    return json({ ok: false, error: "invalid" }, 400);
  }
}

