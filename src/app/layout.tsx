// RootLayout
import { ReactNode } from "react";
import { Nunito, Noto_Sans_KR, Montserrat } from "next/font/google";
import MainLayout from "@/components/MainLayout";
import "./globals.css";
import type { Metadata } from "next";
import { LanguageProvider } from "@/context/LanguageContext";

export const viewport = {
  width: "device-width",
  initialScale: 1,
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
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${nunito.variable} ${notoSansKr.variable} ${montserrat.variable}`}>
      <body className="flex min-h-screen flex-col font-sans bg-white text-slate-800 antialiased selection:bg-frage-yellow selection:text-frage-blue">
        <LanguageProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </LanguageProvider>
      </body>
    </html>
  );
}
