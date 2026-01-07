import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveRole } from "@/lib/auth/resolveRole";

export default async function AuthRedirectPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  console.log("AUTH REDIRECT USER", user);
  console.log("AUTH REDIRECT APP META", (user as any)?.app_metadata);
  console.log("AUTH REDIRECT USER META", (user as any)?.user_metadata);

  if (!user) {
    console.log("AUTH REDIRECT: no user, go /portal");
    redirect("/portal");
  }

  const role = resolveRole({ authUser: user, profile: null });
  console.log("AUTH REDIRECT ROLE", role);

  if (role === "master_admin") {
    redirect("/admin/master/dashboard");
  }

  if (role === "admin" || role === "teacher") {
    redirect("/admin/home");
  }

  redirect("/portal/home");
}
