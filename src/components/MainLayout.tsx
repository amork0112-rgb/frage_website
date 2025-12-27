"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import KakaoCTA from "@/components/KakaoCTA";

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Hide main layout elements for portal, admin, and teacher pages
  const isSpecialPage = pathname?.startsWith("/portal") || pathname?.startsWith("/admin") || pathname?.startsWith("/teacher");

  return (
    <>
      {!isSpecialPage && <Header />}
      <div className="flex-grow">
        {children}
      </div>
      {!isSpecialPage && <Footer />}
      <KakaoCTA />
    </>
  );
}