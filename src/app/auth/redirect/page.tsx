"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { redirectAfterAuth } from "@/lib/authRedirect";

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      const email = user.email || null;
      redirectAfterAuth(router, email);
    })();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-sm text-slate-600">리디렉션 중…</div>
    </div>
  );
}
