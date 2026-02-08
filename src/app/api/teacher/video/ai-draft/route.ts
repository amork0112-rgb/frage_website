
import { NextResponse } from "next/server";
import { generateFeedbackDraft } from "@/lib/ai/grading";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Teacher Check (DB Source of Truth)
    const { data: teacher, error: teacherError } = await supabaseService
      .from("teachers")
      .select("id, role, campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (teacherError) {
      console.error("❌ teachers query failed", teacherError);
      return NextResponse.json({ error: "Teacher query error" }, { status: 500 });
    }

    if (!teacher) {
      return NextResponse.json({ error: "Forbidden: Teacher only" }, { status: 403 });
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
