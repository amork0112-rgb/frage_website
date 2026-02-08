// RootLayout
import { ReactNode } from "react";
import { Nunito, Noto_Sans_KR, Montserrat } from "next/font/google";
import MainLayout from "@/components/MainLayout";
import PWARegister from "@/components/PWARegister";
import "./globals.css";
import type { Metadata } from "next";
import { LanguageProvider } from "@/context/LanguageContext";
import { createSupabaseServer } from "@/lib/supabase/server";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8f3fff",
};

const nunito = Nunito({ 
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FRAGE EDU | English for Thinking Minds",
  description: "Building strong readers, clear thinkers, and confident communicators.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let shouldRegisterPWA = false;

  if (user) {
    // Teachers/Admins are in the teachers table
    // Use supabaseService to bypass RLS and ensure accurate role check
    const { data: teacher } = await supabaseService
      .from("teachers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    // Only register PWA for parents (User exists AND NOT in teachers table)
    if (!teacher) {
      shouldRegisterPWA = true;
    }
  }

  return (
    <html lang="ko" className={`${nunito.variable} ${notoSansKr.variable} ${montserrat.variable}`}>
      <head>
        {/* PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FRAGE EDU" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="flex min-h-screen flex-col font-sans bg-white text-slate-800 antialiased selection:bg-frage-yellow selection:text-frage-blue">
        <PWARegister shouldRegister={shouldRegisterPWA} />
        <LanguageProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </LanguageProvider>
      </body>
    </html>
  );
}
