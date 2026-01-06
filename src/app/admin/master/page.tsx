import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMasterIndex() {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const uid = user?.id || "";
  console.log("UID:", uid);
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
  const { data: prof } = await (supabaseServer as any).from("profiles").select("role").eq("id", uid).maybeSingle();
  console.log("PROFILE:", prof);
  if (!prof || String(prof.role) !== "master_admin") {
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
