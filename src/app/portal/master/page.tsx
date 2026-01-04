"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MasterPortalIndex() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data?.user?.email || "";
        const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || "";
        const ok = !!email && !!masterEmail && email.toLowerCase() === masterEmail.toLowerCase();
        if (ok) {
          setAuthorized(true);
          router.replace("/portal/master/dashboard");
        } else {
          setAuthorized(false);
        }
      } catch {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm">
          <h1 className="text-xl font-black text-slate-900 mb-2">접근 권한 없음</h1>
          <p className="text-slate-500 text-sm mb-6">Master Admin 전용 페이지입니다.</p>
          <Link href="/portal" className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-bold">
            포털 홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
