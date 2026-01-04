"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { redirectAfterAuth } from "@/lib/authRedirect";

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let retry = 0;
    const minDelay = 100;
    const maxDelay = 200;
    const maxRetries = 8;

    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      // ⏳ Supabase 세션 대기 (핵심)
      if (!user) {
        if (retry < maxRetries) {
          retry += 1;
          const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          setTimeout(run, delay);
        } else {
          router.replace("/portal");
        }
        return;
      }

      // ✅ 여기까지 왔다는 건 user 확보 완료
      redirectAfterAuth(router, user.email ?? null);
    };

    run();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-sm text-slate-600">리디렉션 중…</div>
    </div>
  );
}
