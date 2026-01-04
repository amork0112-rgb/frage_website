"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      if (pathname === "/portal") return;
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace("/portal");
      }
    })();
  }, [router, pathname]);

  return <>{children}</>;
}
