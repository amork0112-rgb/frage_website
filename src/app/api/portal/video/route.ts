//app/api/portal/video/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export const dynamic = "force-dynamic";

export async function GET(req: Request) { 
   try { 
     console.log("📹 [VIDEO PORTAL] ==========================="); 
 
     const supabase = createSupabaseServer(); 
     const { data: { user } } = await supabase.auth.getUser(); 
 
     console.log("🔐 Auth User:", user?.id); 
 
     if (!user) { 
       console.log("❌ No auth user"); 
       return NextResponse.json({ items: [] }, { status: 401 }); 
     } 
 
     // 1️⃣ Parent 찾기 
     const { data: parent } = await supabaseService 
       .from("parents") 
       .select("*") 
       .eq("auth_user_id", user.id) 
       .single(); 
 
     console.log("👨‍👩‍👧 Parent Row:", parent); 
 
     if (!parent) { 
       console.log("❌ Parent not found for auth_user_id"); 
       return NextResponse.json({ items: [] }, { status: 200 }); 
     } 
 
     // 2️⃣ Student 찾기 
     const { data: students } = await supabaseService 
       .from("students") 
       .select("*") 
       .eq("parent_id", parent.id); 
 
     console.log("🎓 Students:", students); 
 
     const student = students?.[0]; 
 
     if (!student) { 
       console.log("❌ No student found for parent_id"); 
       return NextResponse.json({ items: [] }, { status: 200 }); 
     } 
 
     console.log("🎓 Selected Student:", student.id); 
     console.log("🏫 main_class:", student.main_class); 
 
     // 3️⃣ Class 찾기 
     const { data: classRow } = await supabaseService 
       .from("classes") 
       .select("*") 
       .eq("id", student.main_class) 
       .single(); 
 
     console.log("🏫 Class Row:", classRow); 
 
     if (!classRow) { 
       console.log("❌ Class not found"); 
       return NextResponse.json({ items: [] }, { status: 200 }); 
     } 
 
     const cls = classRow.name; 
     console.log("🏫 Class Name:", cls); 
 
     // 4️⃣ Lessons 조회 
     const { data: lessons } = await supabaseService 
       .from("v_lesson_video_status") 
       .select("*") 
       .eq("class_name", cls) 
       .eq("has_auto_video", true) 
       .not("class_id", "is", null) 
       .order("lesson_date", { ascending: false }); 
 
     console.log("📚 Lessons:", lessons?.length); 
 
     if (!lessons || lessons.length === 0) { 
       console.log("❌ No lessons found"); 
       return NextResponse.json({ items: [] }, { status: 200 }); 
     } 
 
     // 5️⃣ Assignment Key 생성 
     const studentId = student.id; 
     const keys = lessons.map(l => `${l.lesson_plan_id}_${studentId}`); 
 
     console.log("🔑 Assignment Keys Sample:", keys.slice(0, 3)); 
 
     // 6️⃣ Submission 조회 
     const { data: submissions } = await supabaseService 
       .from("portal_video_submissions") 
       .select("*") 
       .in("assignment_key", keys); 
 
     console.log("📤 Submissions:", submissions?.length); 
 
     const submissionIds = (submissions || []).map(s => s.id); 
 
     // 7️⃣ Feedback 조회 
     const { data: feedbacks } = await supabaseService 
       .from("portal_video_feedback") 
       .select("*") 
       .in("submission_id", submissionIds); 
 
     console.log("📝 Feedbacks:", feedbacks?.length); 
 
     console.log("📹 [VIDEO PORTAL END] ======================="); 
 
     return NextResponse.json({ items: [] }, { status: 200 }); 
 
   } catch (err) { 
     console.error("🔥 VIDEO API ERROR:", err); 
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
