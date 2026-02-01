"use client";

import { useEffect, useState } from "react";

let deferredPrompt: any = null;

export default function AndroidInstallButton() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
  };

  if (!canInstall) return null;

  return (
    <button
      onClick={handleInstall}
      className="w-full rounded-lg bg-frage-navy py-3 text-white font-semibold shadow-md hover:bg-frage-blue transition-colors"
    >
      홈 화면에 추가하기
    </button>
  );
}
