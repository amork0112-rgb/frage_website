"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { redirectAfterAuth } from "@/lib/authRedirect";

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let retry = 0;
    const maxRetries = 8;

    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        if (retry < maxRetries) {
          retry += 1;
          setTimeout(run, 150);
        } else {
          router.replace("/portal");
        }
        return;
      }

      const normalizedEmail = String(user.email ?? "")
        .trim()
        .toLowerCase();

      redirectAfterAuth(router, normalizedEmail);
    };

    run();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-sm text-slate-600">리디렉션 중…</div>
    </div>
  );
}
