import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import AdminHeader from "@/components/AdminHeader";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal");
  }

  // Check role strictly
  let role = user.app_metadata?.role ?? "parent";

  // Double check from DB if role is parent (fallback)
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

  // 🚨 Strict Admin Check: Only 'admin' or 'master_admin' allowed
  // 'master_teacher' or 'teacher' must be redirected to /teacher
  if (role !== "admin" && role !== "master_admin") {
    if (role === "teacher" || role === "master_teacher") {
      redirect("/teacher");
    } else {
      redirect("/portal");
    }
  }

  return (
    <>
      <AdminHeader />
      <main>{children}</main>
    </>
  );
}
