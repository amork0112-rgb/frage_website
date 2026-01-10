"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EntryPage() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/entry", { cache: "no-store" });
        const payload = await res.json();
        const to = String(payload?.redirect || "/portal");
        router.replace(to);
      } catch {
        router.replace("/portal");
      }
    })();
  }, [router]);
  return null;
}
