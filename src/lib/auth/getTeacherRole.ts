import { User } from "@supabase/supabase-js";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Resolves the user's role, including fallbacks for teacher roles
 * stored in the 'teachers' table or hardcoded master email.
 */
export async function getTeacherRole(user: User): Promise<string> {
  let role = user.app_metadata?.role ?? "parent";

  // Fallback: Check teachers table if role is parent (metadata might be stale)
  if (role === "parent") {
    const { data: teacher } = await supabaseService
      .from("teachers")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (teacher?.role) {
      role = teacher.role;
    }
  }

  // Fallback: Hardcode master teacher email if needed
  if (user.email === "master_teacher@frage.com") {
    role = "master_teacher";
  }

  return role;
}
