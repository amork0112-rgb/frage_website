import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();

    /* 1️⃣ 로그인 유저 */
    const { data: userData } = await supabaseAuth.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role !== "parent") return json({ error: "forbidden" }, 403);

    /* 2️⃣ 부모 기준 new_students 조회 (🔥 핵심 수정) */
    const { data: stu } = await supabaseAuth
      .from("new_students")
      .select("id")
      .eq("parent_auth_user_id", user.id)
      .maybeSingle();

    if (!stu) return json({ error: "no_new_student" }, 404);

    /* 3️⃣ payload */
    const body = await req.json();
    const leadSource = Array.isArray(body?.lead_source) ? body.lead_source : [];
    const interestReasons = Array.isArray(body?.interest_reasons) ? body.interest_reasons : [];
    const expectations = String(body?.expectations || "");
    const concerns = body?.concerns ? String(body.concerns) : null;

    if (leadSource.length === 0 || interestReasons.length === 0 || !expectations) {
      return json({ error: "missing_fields" }, 400);
    }

    /* 4️⃣ survey 저장 */
    const now = new Date().toISOString();
    const { error } = await supabaseService
      .from("admission_surveys")
      .upsert(
        {
          new_student_id: stu.id, // show-stopper 해결 포인트
          lead_source: leadSource,
          interest_reasons: interestReasons,
          expectations,
          concerns,
          updated_at: now,
        },
        { onConflict: "new_student_id" }
      );

    if (error) return json({ error: "insert_failed" }, 500);

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "invalid" }, 400);
  }
}
