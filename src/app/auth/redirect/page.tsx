
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

  console.log("✅ [AuthRedirect] Setup complete, redirecting to /admission");
  redirect("/admission"); 
} 
