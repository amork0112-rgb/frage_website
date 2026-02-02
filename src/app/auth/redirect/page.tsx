import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export default async function AuthRedirectPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/portal");

  const role = await resolveUserRole(user);

  // Check PWA Prompt Status
  const { data: profile } = await supabase
    .from("profiles")
    .select("pwa_prompt_seen")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.pwa_prompt_seen) {
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
