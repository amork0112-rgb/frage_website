import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveUserRole } from "../../../lib/auth/resolveUserRole";

export default async function AuthRedirectPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/portal");

  const role = await resolveUserRole(user);

  console.log("🔐 AUTH ROLE:", role, "User ID:", user.id);

  // Check PWA Prompt Status using user_onboarding table
  const { data: onboarding } = await supabase
    .from("user_onboarding")
    .select("pwa_prompt_seen")
    .eq("user_id", user.id)
    .maybeSingle();

  console.log("📱 Onboarding Status:", onboarding);

  if (!onboarding?.pwa_prompt_seen) {
    console.log("🚀 Redirecting to /portal/install");
    redirect("/portal/install");
  }

  if (role === "master_admin" || role === "admin") {
    redirect("/admin/home");
  }

  if (["teacher", "master_teacher", "campus"].includes(role)) {
    redirect("/teacher/home");
  }

  if (role === "parent") {
    redirect("/entry");
  }

  redirect("/portal");
}
