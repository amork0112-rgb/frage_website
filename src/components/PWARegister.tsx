"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      } else {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            regs.forEach((r) => r.unregister());
          })
          .catch(() => {});
      }
    }
  }, []);

  return null;
}
