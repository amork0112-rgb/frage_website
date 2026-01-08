import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function AuthRedirectPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  console.log("AUTH REDIRECT USER", user);

  if (!user) {
    redirect("/portal");
  }

  const role = user?.app_metadata?.role ?? "parent";

  if (role === "master_admin" || role === "admin") {
    redirect("/admin/home");
  }
  
  if (role === "teacher") {
    redirect("/teacher/home");
  }

  redirect("/portal/home");
}
