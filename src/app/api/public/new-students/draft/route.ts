import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const phone = String(body?.phone || "").trim();
    const memo = body?.memo ? String(body.memo) : null;
    const campus = String(body?.campus || "전체");
    if (!name || !phone) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }
    const supabase = createSupabaseServer();
    const { error } = await supabase
      .from("new_students")
      .insert({
        student_name: name,
        phone,
        campus,
        status: "draft",
        memo,
        parent_name: null,
      });
    if (error) {
      return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
