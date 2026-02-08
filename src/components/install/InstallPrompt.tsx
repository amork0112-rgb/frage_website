"use client";

import { useEffect, useState } from "react";
import AndroidInstallButton from "./AndroidInstallButton";
import IOSGuide from "./IOSGuide";
import EnableNotificationButton from "../EnableNotificationButton";

export default function InstallPrompt() {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
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
      return () =>
        window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  return (
    <div className="w-full max-w-md text-center bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
      <h1 className="mb-3 text-2xl font-black text-slate-900">
        앱으로 더 편하게!
      </h1>

      <div className="mb-6">
        {isAndroid && canInstall && <AndroidInstallButton />}
        {isIOS && <IOSGuide />}
      </div>

      <EnableNotificationButton />
    </div>
  );
}
