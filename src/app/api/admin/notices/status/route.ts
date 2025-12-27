import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || "");
    const status = String(body?.status || "");
    if (!id || !status) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const map =
      status === "pinned"
        ? { is_pinned: true, is_archived: false }
        : status === "archived"
        ? { is_pinned: false, is_archived: true }
        : { is_pinned: false, is_archived: false };
    const numId = Number(id);
    if (!Number.isNaN(numId)) {
      await supabase.from("posts").update(map).eq("id", numId);
    }
    return NextResponse.json({ ok: true, id, status }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}
