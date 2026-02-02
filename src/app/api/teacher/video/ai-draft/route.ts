
import { NextResponse } from "next/server";
import { generateFeedbackDraft } from "@/lib/ai/grading";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = await resolveUserRole(user);
    if (!["teacher", "master_teacher", "admin", "master_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { scores, student_name } = body;

    if (!scores || !student_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const draft = generateFeedbackDraft(scores, student_name);

    return NextResponse.json({ data: draft });
  } catch (error: any) {
    console.error("AI Draft Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
