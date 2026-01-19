import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function requireAdmin(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: new NextResponse(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }) };
  }
  
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

  // Fallback: Master teacher email (optional, for safety)
  if (user.email === "master_teacher@frage.com") {
    // If master_teacher is considered an admin-level role for some features, 
    // but typically requireAdmin implies 'admin' or 'master_admin'.
    // If master_teacher should access admin panel, we should allow it.
    // Given the context, the user might be testing as master_teacher.
    // I will check if master_teacher is allowed.
    // For now, I will stick to 'admin' and 'master_admin'.
    // If the user's role in DB is 'master_teacher', they will fail this check 
    // unless we include 'master_teacher' in the allowed list.
    // Let's assume strict admin for now, but if the user IS master_teacher and needs access,
    // they should have 'admin' role or we should expand the check.
    // However, based on 'requireAdmin' name, it should be admin.
  }

  if (role !== "admin" && role !== "master_admin") {
    return { error: new NextResponse(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } }) };
  }
  return { user };
}
