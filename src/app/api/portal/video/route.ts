//app/api/portal/video/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ items: [] }, { status: 401 });

    // We allow all authenticated users to access portal video. 
    // Data isolation is handled by user.id filtering in the queries.
    const role = await resolveUserRole(user);

    // 0. 부모 auth → 학생 찾기
    const { data: parent } = await supabaseService
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!parent) return NextResponse.json({ items: [] }, { status: 200 });

    const { data: students } = await supabaseService
      .from("students")
      .select("id, main_class")
      .eq("parent_id", parent.id)
      .limit(1);

    const student = students?.[0];
    if (!student) return NextResponse.json({ items: [] }, { status: 200 });

    const studentId = student.id;

    // Fetch class name from classes table using main_class
    let cls = "";
    if (student.main_class) {
      const { data: classRow } = await supabaseService
        .from("classes")
        .select("name")
        .eq("id", student.main_class)
        .single();
      cls = classRow?.name || "";
    }

    if (!cls) return NextResponse.json({ items: [] }, { status: 200 });

    // 2. Fetch Lessons from v_lesson_video_status
    // Filter for "Primary" logic: has_auto_video = true AND class_id IS NOT NULL
    const { data: lessons } = await supabaseService
      .from("v_lesson_video_status")
      .select("*")
      .eq("class_name", cls)
      .eq("has_auto_video", true)
      .not("class_id", "is", null)
      .order("lesson_date", { ascending: false });

    if (!lessons || lessons.length === 0) {
       return NextResponse.json({ items: [] }, { status: 200 });
    }

    // 3. Prepare Assignment Keys
    const keys = lessons.map(l => `${l.lesson_plan_id}_${studentId}`);

    // 4. Fetch Submissions using assignment_key
    const { data: submissions } = await supabaseService
      .from("portal_video_submissions")
      .select("id, assignment_key, video_path") // Select id here
      .in("assignment_key", keys);

    const submissionIds = (submissions || []).map(s => s.id); // Extract submission IDs

    // 5. Fetch Feedback using submission_id
    const { data: feedbacks } = await supabaseService
      .from("portal_video_feedback")
      .select("*")
      .in("submission_id", submissionIds); // Use submission_id

    const subMap = new Map();
    (submissions || []).forEach(s => subMap.set(s.assignment_key, s));

    const fbMap = new Map();
    (feedbacks || []).forEach(f => fbMap.set(f.submission_id, f)); // Map by submission_id

    // 6. Map to Response
    const items = await Promise.all(lessons.map(async (l) => {
        const key = `${l.lesson_plan_id}_${studentId}`;
        const sub = subMap.get(key);
        const fb = sub ? fbMap.get(sub.id) : null; // Lookup feedback using sub.id

        let status: "Pending" | "Submitted" | "Reviewed" = "Pending";
        if (sub && !fb) status = "Submitted";
        if (sub && fb) status = "Reviewed";

        let signedUrl: string | null = null;
        if (sub?.video_path) {
             try {
                // Generate signed URL for playback
                const res = await supabase.storage.from("student-videos").createSignedUrl(sub.video_path, 3600);
                signedUrl = res.data?.signedUrl || null;
             } catch {}
        }

        return {
            id: key, // Use assignment_key as ID
            title: `${l.book_id || ""} ${l.unit_no ? `Unit ${l.unit_no}` : ""}`,
            module: l.book_id || "Reading",
            dueDate: l.lesson_date,
            status,
            score: fb ? String(fb.average ?? "") : null,
            feedback: fb ? {
                overall_message: fb.overall_message || "",
                strengths: fb.strengths || [],
                focus_point: fb.focus_point || "",
                next_try_guide: fb.next_try_guide || "",
                details: {
                    Fluency: mapScore(Number(fb.fluency || 0), "fluency"),
                    Volume: mapScore(Number(fb.volume || 0), "volume"),
                    Speed: mapScore(Number(fb.speed || 0), "speed"),
                    Pronunciation: mapScore(Number(fb.pronunciation || 0), "pronunciation"),
                    Performance: mapScore(Number(fb.performance || 0), "performance")
                }
            } : null,
            videoUrl: signedUrl
        };
    }));

    return NextResponse.json({ items }, { status: 200 });

  } catch (err) {
      console.error("Portal Video API Error:", err);
      return NextResponse.json({ items: [] }, { status: 500 });
  }
}

function mapScore(n: number, type: "fluency" | "volume" | "speed" | "pronunciation" | "performance") {
  if (type === "volume") return n >= 4 ? "Strong" : n === 3 ? "Clear" : n === 2 ? "Developing" : "Needs Support";
  if (type === "speed") return n >= 4 ? "Natural" : n === 3 ? "Appropriate" : n === 2 ? "Developing" : "Too Slow";
  if (type === "pronunciation") return n >= 4 ? "Consistently Precise" : n === 3 ? "Mostly Accurate" : n === 2 ? "Developing" : "Needs Support";
  if (type === "performance") return n >= 4 ? "Engaging" : n === 3 ? "Focused" : n === 2 ? "Developing" : "Needs Support";
  return n >= 4 ? "Excellent" : n === 3 ? "Appropriate" : n === 2 ? "Developing" : "Needs Support";
}
