"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/home");
  }, [router]);
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center">
      <a href="/admin/home" className="text-frage-blue font-bold">관리자 홈으로 이동</a>
    </div>
  );
}
