import PortalMasterDashboard from "@/app/portal/master/dashboard/page";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export default async function AdminMasterDashboard() {
  const supabaseAuth = createSupabaseServer();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm">
          <h1 className="text-xl font-black text-slate-900 mb-2">접근 권한 없음</h1>
          <p className="text-slate-500 text-sm">로그인이 필요합니다.</p>
          <a href="/portal" className="mt-6 inline-block px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-bold">포털 홈으로 이동</a>
        </div>
      </div>
    );
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
  return <PortalMasterDashboard />;
}
