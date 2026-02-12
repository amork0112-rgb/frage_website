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
  // 1. Check profiles (Admin / Master Admin)
  const { data: profile } = await supabaseService
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    if (profile.role === "master_admin") return "master_admin";
    
    // Fallback: Check email if role is not explicitly master_admin but should be
    const email = user.email || "";
    const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || "";
    if (email && masterEmail && email.toLowerCase() === masterEmail.toLowerCase()) {
      return "master_admin";
    }
    return (profile.role as UserRole) || "admin";
  }

  const { data: teacher } = await supabaseService
    .from("teachers")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (teacher?.role) return teacher.role;

  // parent만 fallback
  return "parent";
}
