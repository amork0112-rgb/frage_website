// /auth/redirect 
import { redirect } from "next/navigation"; 
import { createSupabaseServer } from "@/lib/supabase/server"; 
import { resolveUserRole } from "../../../lib/auth/resolveUserRole"; 

export default async function AuthRedirectPage() { 
  const supabase = createSupabaseServer(); 
  const { data: { user } } = await supabase.auth.getUser(); 

  if (!user) redirect("/portal"); 

  const role = await resolveUserRole(user); 

  console.log("🔐 AUTH ROLE:", role, "User ID:", user.id); 

  // 1️⃣ 관리자 
  if (role === "master_admin" || role === "admin") { 
    redirect("/admin/home"); 
  } 

  // 2️⃣ 교사 계열은 onboarding 스킵 
  if (["teacher", "master_teacher", "campus"].includes(role)) { 
    redirect("/teacher/home"); 
  } 

  // 3️⃣ 학부모만 onboarding 체크 
  const { data: onboarding } = await supabase 
    .from("user_onboarding") 
    .select("pwa_prompt_seen") 
    .eq("user_id", user.id) 
    .maybeSingle(); 

  console.log("📱 Onboarding Status:", onboarding); 

  if (role === "parent" && !onboarding?.pwa_prompt_seen) { 
    redirect("/portal/install"); 
  } 

  // 4️⃣ 학부모 정상 진입
  if (role === "parent") { 
    redirect("/admission"); 
  } 

  redirect("/portal"); 
}