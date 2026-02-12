
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

  // ✅ 1. Admin Check (profiles table)
  // Admin & Master Admin are both in 'profiles' table.
  // We check for existence (select 'id') because there is no 'role' column in profiles.
  console.log("🔍 [AuthRedirect] Checking profiles table for user:", user.id);
  const { data: profile, error: profileError } = await supabase 
   .from("profiles") 
   .select("id") 
   .eq("id", user.id) 
   .maybeSingle(); 

  if (profileError) {
    console.error("🔥 [AuthRedirect] Error checking profiles:", profileError);
  } else {
    console.log("🔍 [AuthRedirect] Profiles check result:", profile);
  }
 
  if (profile) { 
   console.log("🛡️ [AuthRedirect] Admin detected (in profiles), redirecting to /admin/home"); 
   redirect("/admin/home"); 
  }

  // ✅ 2. Teacher Check (teachers table)
  // teacher / master_teacher are in 'teachers' table
  const { data: teacher } = await supabase 
    .from("teachers") 
    .select("role") 
    .eq("auth_user_id", user.id) 
    .maybeSingle(); 

  if (teacher) { 
    console.log("👨‍🏫 [AuthRedirect] Teacher detected. Role:", teacher.role);
    console.log("👩‍🏫 Redirecting to Teacher Home");
    redirect("/teacher/home"); 
  } 


  // ✅ 기존 학부모 확인 (auth_user_id 연결 존재 여부)
  // enrollment의 결과가 최종적으로 남는 곳이 students이므로 가장 신뢰도 높음
  const { data: students } = await supabase
    .from("parents")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (parent) {
    console.log("👨‍👩‍👧 [AuthRedirect] Existing parent (has students), redirecting to /portal/home");
    redirect("/portal/home");
  }

  console.log("✅ [AuthRedirect] New parent, redirecting to /admission");
  redirect("/admission"); 
} 
