import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const role = user.app_metadata?.role ?? "parent";
    if (role !== "admin" && role !== "master_admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
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
      await supabaseService.from("posts").update(map).eq("id", numId);
    }
    return NextResponse.json({ ok: true, id, status }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}
