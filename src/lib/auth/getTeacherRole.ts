import { supabaseService } from "@/lib/supabase/service";
import { User } from "@supabase/supabase-js";

export async function getTeacherRole(user: User): Promise<string> {
  let role = user.app_metadata?.role ?? "parent";

  // Fallback: Check teachers table if role is parent (default)
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

  // Hardcoded master teacher check (legacy/safety)
  if (user.email === "master_teacher@frage.com") {
    role = "master_teacher";
  }

  return role;
}
