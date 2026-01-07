import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabase/server";
import PortalMasterDashboard from "@/app/portal/master/dashboard/page";
import { resolveRole } from "@/lib/auth/resolveRole";

export const dynamic = "force-dynamic";

export default async function AdminMasterDashboard() {
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (k) => cookies().get(k)?.value } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const uid = user?.id || "";
  if (!uid) {
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
  let profile: any = null;
  try {
    const { data: p } = await (supabaseServer as any).from("profiles").select("role").eq("id", uid).maybeSingle();
    profile = p || null;
  } catch {}
  const role = resolveRole({ authUser: user, profile });
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
  return <PortalMasterDashboard />;
}
