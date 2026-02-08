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

  // ✅ 1️⃣ 관리자 계정은 onboarding/PWA 스킵 
  if (role === "master_admin" || role === "admin") { 
    redirect("/admin/home"); 
  } 

  // ✅ 2️⃣ onboarding은 일반 사용자만 
  const { data: onboarding } = await supabase 
    .from("user_onboarding") 
    .select("pwa_prompt_seen") 
    .eq("user_id", user.id) 
    .maybeSingle(); 

  console.log("📱 Onboarding Status:", onboarding); 

  if (!onboarding?.pwa_prompt_seen) { 
    redirect("/portal/install"); 
  } 

  // ✅ 3️⃣ role별 정상 분기 
  if (["teacher", "master_teacher", "campus"].includes(role)) { 
    redirect("/teacher/home"); 
  } 

  if (role === "parent") { 
    redirect("/entry"); 
  } 

  redirect("/portal"); 
}