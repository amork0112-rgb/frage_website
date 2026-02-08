"use client";

import { useEffect } from "react";

export default function PWARegister({ shouldRegister }: { shouldRegister: boolean }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (shouldRegister && process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      } else {
        // If shouldRegister is false OR we are not in production:
        // Unregister any existing service workers to ensure clean state
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            regs.forEach((r) => r.unregister());
          })
          .catch(() => {});
      }
    }
  }, [shouldRegister]);

  return null;
}
