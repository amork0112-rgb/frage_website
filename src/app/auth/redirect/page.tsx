import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveRole } from "@/lib/auth/resolveRole";

export default async function AuthRedirectPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  console.log("AUTH REDIRECT USER", user);

  if (!user) {
    redirect("/portal");
  }

  const role = resolveRole(user, null);

  if (role === "master_admin") {
    redirect("/admin/master/dashboard");
  }

  if (role === "admin" || role === "teacher") {
    redirect("/admin/home");
  }

  redirect("/portal/home");
}
