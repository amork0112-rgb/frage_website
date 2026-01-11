import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabaseService
    .from("consultation_slots")
    .delete()
    .lt("date", today);

  if (error) {
    console.error("Cron delete error:", error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
