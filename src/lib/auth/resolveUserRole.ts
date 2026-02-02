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
 * Resolve user role from DB only.
 * Source of truth:
 * - profiles → admin
 * - teachers → teacher
 * - parents → parent
 */
export async function resolveUserRole(user: User): Promise<UserRole> {
  // 1️⃣ 관리자
  const { data: admin } = await supabaseService
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (admin?.role) {
    return admin.role as UserRole;
  }

  // 2️⃣ 교사
  const { data: teacher } = await supabaseService
    .from("teachers")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (teacher?.role) {
    return teacher.role as UserRole;
  }

  // 3️⃣ 학부모
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
