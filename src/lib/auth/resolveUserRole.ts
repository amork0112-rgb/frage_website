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
  // 1. Check profiles (Admin)
  const { data: profile } = await supabaseService
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) return "admin";

  const { data: teacher } = await supabaseService
    .from("teachers")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (teacher?.role) return teacher.role;

  // parent만 fallback
  return "parent";
}
