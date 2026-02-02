"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AndroidInstallButton from "./AndroidInstallButton";
import IOSGuide from "./IOSGuide";
import EnableNotificationButton from "../EnableNotificationButton";

export default function InstallPrompt() {
  const router = useRouter();
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isAnd = ua.includes("android");
    const isI = /iphone|ipad|ipod/.test(ua);
    
    setIsAndroid(isAnd);
    setIsIOS(isI);
    
    if (isAnd) {
      const handler = (e: any) => {
        e.preventDefault();
        (window as any).__deferredPrompt = e;
        setCanInstall(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleLater = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/onboarding/complete", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to complete onboarding");
    } catch (e) {
      console.error("Failed to update prompt seen status", e);
    } finally {
      // Redirect back to auth/redirect to route to the correct dashboard
      router.push("/auth/redirect");
    }
  };

  return (
    <div className="w-full max-w-md text-center bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
      <div className="w-16 h-16 bg-frage-navy rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-2xl font-black shadow-lg">
        F
      </div>
      
      <h1 className="mb-3 text-2xl font-black text-slate-900">
        앱으로 더 편하게!
      </h1>

      <p className="mb-8 text-slate-500 leading-relaxed">
        홈 화면에 추가하면<br />
        로그인 유지와 알림 등<br />
        더 편리한 기능을 사용할 수 있어요.
      </p>

      <div className="mb-6">
        {isAndroid && canInstall ? (
          <AndroidInstallButton />
        ) : isIOS ? (
          <IOSGuide />
        ) : null}
      </div>

      <div className="mb-8">
        <EnableNotificationButton />
      </div>

      <button
        onClick={handleLater}
        disabled={loading}
        className="text-sm text-slate-400 underline hover:text-slate-600 transition-colors disabled:opacity-50"
      >
        {loading ? "이동 중..." : "나중에 할게요"}
      </button>
    </div>
  );
}
