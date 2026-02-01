import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function AuthRedirectPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  console.log("AUTH REDIRECT USER", user);

  if (!user) {
    redirect("/portal");
  }

  // Check if user is a parent
  const { data: parentData } = await supabase
    .from("parents")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Determine role
  // Prioritize parent check, then fallback to app_metadata, then default to admin (as per requirement example)
  const role = parentData ? "parent" : (user.app_metadata?.role || "admin");

  // Upsert profile to ensure it exists
  await supabase.from("profiles").upsert({
    id: user.id,
    role,
    updated_at: new Date().toISOString(),
  });

  // Fetch profile to check PWA prompt status
  const { data: profile } = await supabase
    .from("profiles")
    .select("pwa_prompt_seen, role")
    .eq("id", user.id)
    .single();

  // Redirect to install page if parent and hasn't seen prompt
  if (profile?.role === "parent" && !profile?.pwa_prompt_seen) {
    redirect("/portal/install");
  }

  if (role === "master_admin" || role === "admin") {
    redirect("/admin/home");
  }
  
  if (role === "teacher") {
    redirect("/teacher/home");
  }

  redirect("/entry");
}
