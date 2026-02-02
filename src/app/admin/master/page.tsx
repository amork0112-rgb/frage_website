import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export const dynamic = "force-dynamic";

export default async function AdminMasterIndex() {
  const supabaseAuth = createSupabaseServer();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const cookieStore = cookies();
  const access = cookieStore.get("sb-access-token")?.value || "";
  const refresh = cookieStore.get("sb-refresh-token")?.value || "";
  console.log("SUPABASE USER", user);
  console.log("TOKENS", { hasAccess: !!access, accessLen: access.length, hasRefresh: !!refresh, refreshLen: refresh.length });
  if (!user) {
    redirect("/portal");
  }
  const role = await resolveUserRole(user);
  if (role !== "master_admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm">
          <h1 className="text-xl font-black text-slate-900 mb-2">접근 권한 없음</h1>
          <p className="text-slate-500 text-sm">Master Admin만 접근 가능합니다.</p>
          <a href="/portal" className="mt-6 inline-block px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-bold">포털 홈으로 이동</a>
        </div>
      </div>
    );
  }
  redirect("/admin/master/dashboard");
}
