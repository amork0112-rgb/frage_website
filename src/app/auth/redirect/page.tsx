
import { redirect } from "next/navigation"; 
import { createSupabaseServer } from "@/lib/supabase/server"; 

export default async function AuthRedirectPage() { 
  const supabase = createSupabaseServer(); 
  const { data: { user } } = await supabase.auth.getUser(); 

  if (!user) {
    console.log("🔒 [AuthRedirect] No user found, redirecting to /portal");
    redirect("/portal"); 
  }

  console.log("👤 [AuthRedirect] User found:", user.id);

  // ✅ teachers 테이블 = 교사 / 관리자 판별 
  const { data: teacher } = await supabase 
    .from("teachers") 
    .select("role") 
    .eq("auth_user_id", user.id) 
    .maybeSingle(); 

  if (teacher) { 
    console.log("👨‍🏫 [AuthRedirect] Teacher/Admin detected, redirecting to /teacher/home. Role:", teacher.role);
    redirect("/teacher/home"); 
  } 

  // ✅ parent만 onboarding 
  const { data: onboarding } = await supabase 
    .from("user_onboarding") 
    .select("pwa_prompt_seen") 
    .eq("user_id", user.id) 
    .maybeSingle(); 
    
  console.log("📱 [AuthRedirect] Parent detected. Onboarding status:", onboarding);

  if (!onboarding?.pwa_prompt_seen) { 
    console.log("🆕 [AuthRedirect] PWA prompt not seen, redirecting to /portal/install");
    redirect("/portal/install"); 
  } 

  // ✅ 기존 학부모 확인 (students 테이블에 parent_auth_user_id 연결 존재 여부)
  // enrollment의 결과가 최종적으로 남는 곳이 students이므로 가장 신뢰도 높음
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("parent_auth_user_id", user.id)
    .limit(1);

  if (students && students.length > 0) {
    console.log("👨‍👩‍👧 [AuthRedirect] Existing parent (has students), redirecting to /portal/home");
    redirect("/portal/home");
  }

  console.log("✅ [AuthRedirect] New parent, redirecting to /admission");
  redirect("/admission"); 
} 
