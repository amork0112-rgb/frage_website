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
    const grade = String(body?.grade || "");
    const currentSchool = String(body?.currentSchool || "");
    const englishHistory = String(body?.englishHistory || "");
    const officialScore = body?.officialScore ? String(body.officialScore) : null;
    const srScore = body?.srScore ? String(body.srScore) : null;
    const availableDays = String(body?.availableDays || "");

    if (!studentId || !grade || !currentSchool || !englishHistory || !availableDays) {
      return json({ error: "missing_fields" }, 400);
    }

    const { data: stu } = await supabaseAuth
      .from("new_students")
      .select("id,student_name,campus,parent_id")
      .eq("id", studentId)
      .maybeSingle();

    if (!stu) return json({ error: "no_new_student" }, 404);

    const payload = {
      grade,
      currentSchool,
      englishHistory,
      officialScore,
      srScore,
      availableDays,
      submittedAt: new Date().toISOString(),
    };

    const insertRow = {
      child_id: String(stu.parent_id || ""),
      child_name: String(stu.student_name || ""),
      campus: String(stu.campus || "International"),
      type: "admission_extra_info",
      note: JSON.stringify(payload),
      created_at: new Date().toISOString(),
    };

    const { error: insErr } = await supabaseService
      .from("portal_requests")
      .insert(insertRow);

    if (insErr) return json({ error: "insert_failed" }, 500);

    return json({ ok: true });
  } catch {
    return json({ error: "invalid" }, 400);
  }
}
