"use client";

import { usePathname } from "next/navigation";

const href = "http://pf.kakao.com/_QGQvxj/chat";

export default function KakaoCTA() {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith("/portal");

  // Portal pages have a bottom nav on mobile, so we need to raise the CTA button
  const positionClasses = isPortal 
    ? "bottom-24 lg:bottom-8" 
    : "bottom-8";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed ${positionClasses} right-8 z-50 rounded-full bg-frage-navy border border-frage-gold/30 p-4 text-white shadow-2xl hover:bg-frage-gold transition-colors duration-300 group`}
      title="Inquire via KakaoTalk"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
        <path d="M12 3C5.925 3 1 6.925 1 11.775C1 14.75 2.975 17.375 6.025 18.9C5.875 19.925 5.35 22.375 5.275 22.95C5.275 22.95 5.25 23.075 5.35 23.125C5.45 23.175 5.575 23.15 5.65 23.1C6.275 22.7 9.175 20.725 10.575 19.725C11.05 19.8 11.525 19.85 12 19.85C18.075 19.85 23 15.925 23 11.075C23 6.225 18.075 3 12 3Z" />
      </svg>
    </a>
  );
}