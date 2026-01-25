import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const body = await req.json();
    const { class_id, date } = body;

    if (!class_id || !date) {
      return NextResponse.json({ ok: false, reason: "missing_params" }, { status: 400 });
    }

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }

    // Call RPC
    const { data, error } = await supabase.rpc("generate_student_commitments", {
      p_class_id: class_id,
      p_date: date
    });

    if (error) {
      console.error("RPC Error:", error);
      const msg = error.message || "";
      
      // Map RPC errors to API reasons
      if (msg.includes("already_generated")) {
        return NextResponse.json({ ok: false, reason: "already_generated" });
      }
      if (msg.includes("special_date") || msg.includes("holiday") || msg.includes("no_lesson")) {
        return NextResponse.json({ ok: false, reason: "not_available_today" });
      }

      // Default unexpected error
      return NextResponse.json({ ok: false, reason: "unexpected_error" });
    }

    return NextResponse.json({ ok: true, created: data });

  } catch (e) {
    console.error("Generate API Error:", e);
    return NextResponse.json({ ok: false, reason: "unexpected_error" }, { status: 500 });
  }
}
