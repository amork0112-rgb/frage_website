"use client";

import { useEffect, useState } from "react";

export default function AndroidInstallButton() {
  const handleInstall = async () => {
    const deferredPrompt = (window as any).__deferredPrompt;
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
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
