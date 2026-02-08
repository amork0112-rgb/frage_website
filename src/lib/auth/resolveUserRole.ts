// src/lib/auth/resolveUserRole.ts
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

/**
 * Resolve user role with auth metadata priority.
 * Source of truth:
 * - auth.users.app_metadata.role → admin / master_admin (Priority)
 * - teachers → teacher
 * - parents → parent
 */
export async function resolveUserRole(user: User): Promise<UserRole> {
  // 🔥 0️⃣ auth metadata 최우선
  // Admin / Master Admin은 DB 조회 없이 즉시 반환
  const metaRole = user.app_metadata?.role;
  if (metaRole) {
    return metaRole as UserRole;
  }

  // 1️⃣ 교사
  const { data: teacher } = await supabaseService
    .from("teachers")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (teacher?.role) {
    return teacher.role as UserRole;
  }

  // 2️⃣ 학부모
  const { data: parent } = await supabaseService
    .from("parents")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (parent) {
    return "parent";
  }

  return "unknown";
}
