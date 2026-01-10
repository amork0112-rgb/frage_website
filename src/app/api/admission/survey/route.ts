import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: userData } = await supabaseAuth.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role !== "parent") return json({ error: "forbidden" }, 403);

    const body = await req.json();
    const studentId = String(body?.studentId || "");
    const leadSource = Array.isArray(body?.lead_source) ? body.lead_source : [];
    const interestReasons = Array.isArray(body?.interest_reasons) ? body.interest_reasons : [];
    const expectations = String(body?.expectations || "");
    const concerns = body?.concerns ? String(body.concerns) : null;

    if (!studentId || leadSource.length === 0 || interestReasons.length === 0 || !expectations) {
      return json({ error: "missing_fields" }, 400);
    }

    const { data: stu } = await supabaseAuth
      .from("new_students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();
    if (!stu) return json({ error: "no_new_student" }, 404);

    const now = new Date().toISOString();
    const { error: upErr } = await supabaseService
      .from("admission_surveys")
      .upsert(
        {
          new_student_id: String(stu.id),
          lead_source: leadSource,
          interest_reasons: interestReasons,
          expectations,
          concerns,
          updated_at: now,
        },
        { onConflict: "new_student_id" }
      );
    if (upErr) return json({ error: "insert_failed" }, 500);
    return json({ ok: true }, 200);
  } catch {
    return json({ error: "invalid" }, 400);
  }
}
