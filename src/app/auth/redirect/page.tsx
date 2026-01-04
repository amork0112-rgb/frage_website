"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let retry = 0;
    const maxRetries = 8;

    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      // Supabase 세션 로딩 대기
      if (!user) {
        if (retry < maxRetries) {
          retry += 1;
          setTimeout(run, 150);
        } else {
          router.replace("/portal");
        }
        return;
      }

      const role = (user.app_metadata as any)?.role;

      // ✅ role 기반 최종 분기 (email 비교 금지)
      if (role === "admin") {
        router.replace("/admin/home");
      } else if (role === "teacher") {
        router.replace("/teacher/home");
      } else {
        router.replace("/portal/home");
      }
    };

    run();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-sm text-slate-600">리디렉션 중…</div>
    </div>
  );
}
