import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id || "";
    if (!uid) return NextResponse.json({ items: [] }, { status: 401 });
    const { data: prof } = await (supabaseServer as any).from("profiles").select("role").eq("id", uid).maybeSingle();
    if (!prof || String(prof.role) !== "parent") return NextResponse.json({ items: [] }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const studentId = String(searchParams.get("studentId") || "");
    if (!studentId) return NextResponse.json({ items: [] }, { status: 200 });

    const { data: studentRows } = await supabaseServer
      .from("students")
      .select("*")
      .eq("id", studentId)
      .limit(1);
    const student = Array.isArray(studentRows) && studentRows.length > 0 ? studentRows[0] : null;
    if (!student) return NextResponse.json({ items: [] }, { status: 200 });

    const cls = String(student.class_name ?? student.className ?? "");
    const camp = String(student.campus ?? "");

    const { data: assignments } = await supabaseServer
      .from("video_assignments")
      .select("*")
      .eq("class_name", cls)
      .eq("campus", camp)
      .order("due_date", { ascending: true });

    const { data: submissions } = await supabaseServer
      .from("portal_video_submissions")
      .select("*")
      .eq("student_id", studentId);

    const { data: feedbacks } = await supabaseServer
      .from("portal_video_feedback")
      .select("*")
      .eq("student_id", studentId);

    const subByAssign: Record<string, any> = {};
    (submissions || []).forEach((s: any) => {
      subByAssign[String(s.assignment_id ?? s.assignmentId ?? "")] = s;
    });
    const fbByAssign: Record<string, any> = {};
    (feedbacks || []).forEach((f: any) => {
      const aid = String(f.assignment_id ?? f.assignmentId ?? "");
      const prev = fbByAssign[aid];
      if (!prev || new Date(f.updated_at ?? f.updatedAt ?? 0).getTime() > new Date(prev.updated_at ?? prev.updatedAt ?? 0).getTime()) {
        fbByAssign[aid] = f;
      }
    });

    const items = (assignments || []).map((a: any) => {
      const aid = String(a.id ?? a.assignment_id ?? "");
      const sub = subByAssign[aid] || null;
      const fb = fbByAssign[aid] || null;
      let status: "Pending" | "Submitted" | "Reviewed" = "Pending";
      if (sub && !fb) status = "Submitted";
      if (sub && fb) status = "Reviewed";
      let signedUrl: string | null = null;
      const vp = sub?.video_path || null;
      if (vp) {
        const res = (supabaseServer as any).storage.from("student-videos").createSignedUrl(vp, 60);
        signedUrl = res?.data?.signedUrl || null;
      }
      return {
        id: `hw_${studentId}_${aid}`,
        title: String(a.title || ""),
        module: String(a.module || ""),
        dueDate: String(a.due_date ?? a.dueDate ?? ""),
        status,
        score: fb ? String(fb.average ?? "") : null,
        feedback: fb
          ? {
              overall_message: String(fb.overall_message || ""),
              strengths: Array.isArray(fb.strengths) ? fb.strengths : [],
              focus_point: String(fb.focus_point || ""),
              next_try_guide: String(fb.next_try_guide || ""),
              details: {
                Fluency: mapScore(Number(fb.fluency || 0), "fluency"),
                Volume: mapScore(Number(fb.volume || 0), "volume"),
                Speed: mapScore(Number(fb.speed || 0), "speed"),
                Pronunciation: mapScore(Number(fb.pronunciation || 0), "pronunciation"),
                Performance: mapScore(Number(fb.performance || 0), "performance")
              }
            }
          : null,
        videoUrl: signedUrl,
      };
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

function mapScore(n: number, type: "fluency" | "volume" | "speed" | "pronunciation" | "performance") {
  if (type === "volume") return n >= 4 ? "Strong" : n === 3 ? "Clear" : n === 2 ? "Developing" : "Needs Support";
  if (type === "speed") return n >= 4 ? "Natural" : n === 3 ? "Appropriate" : n === 2 ? "Developing" : "Too Slow";
  if (type === "pronunciation") return n >= 4 ? "Consistently Precise" : n === 3 ? "Mostly Accurate" : n === 2 ? "Developing" : "Needs Support";
  if (type === "performance") return n >= 4 ? "Engaging" : n === 3 ? "Focused" : n === 2 ? "Developing" : "Needs Support";
  return n >= 4 ? "Excellent" : n === 3 ? "Appropriate" : n === 2 ? "Developing" : "Needs Support";
}
