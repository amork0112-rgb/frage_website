import { supabaseService } from "@/lib/supabase/service";
import { User } from "@supabase/supabase-js";

export type UserRole =
  | "master_admin"
  | "admin"
  | "master_teacher"
  | "teacher"
  | "campus"
  | "parent"
  | "unknown";

export async function resolveUserRole(user: User) {
  // 0. Check Master Admin by Email (Highest priority, works even without profile)
  const email = user.email || "";
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || "";
  if (email && masterEmail && email.toLowerCase() === masterEmail.toLowerCase()) {
    return "master_admin";
  }

  // 1. Check profiles (Admin / Master Admin)
  const { data: profile } = await supabaseService
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    const role = (profile.role || "").toLowerCase().trim();
    if (role === "master_admin") return "master_admin";
    if (role === "admin") return "admin";
    
    // If profile exists but role is not explicitly admin/master_admin, 
    // we still check if it's one of the valid roles
    if (role) return role as UserRole;
    
    // Default for profile existence if role is empty
    return "admin";
  }

  // 2. Check teachers
  const { data: teacher } = await supabaseService
    .from("teachers")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (teacher?.role) {
    return (teacher.role.toLowerCase().trim() as UserRole) || "teacher";
  }

  // Fallback
  return "parent";
}
