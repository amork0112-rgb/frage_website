"use client";

import { useEffect, useState } from "react";

export default function AndroidInstallButton() {
  const handleInstall = async () => {
    const deferredPrompt = (window as any).__deferredPrompt;
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      // Mark as seen if user accepted install
      try {
        await fetch("/api/user/onboarding/complete", { method: "POST" });
      } catch {}
    }

    (window as any).__deferredPrompt = null;
  };

  return (
    <button
      onClick={handleInstall}
      className="w-full rounded-lg bg-frage-navy py-3 text-white font-semibold shadow-md hover:bg-frage-blue transition-colors"
    >
      홈 화면에 추가하기
    </button>
  );
}
