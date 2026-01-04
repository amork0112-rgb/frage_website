"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortalSignupCompletePage() {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen font-sans bg-frage-cream">
      <Header />
      <main className="flex-grow pt-32 pb-20">
        <section className="container mx-auto px-6 max-w-xl">
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100 text-center">
            <h1 className="font-serif text-3xl md:text-4xl text-frage-navy font-bold mb-4">
              회원가입 완료
            </h1>
            <p className="text-frage-gray mb-8">
              가입이 완료되었습니다. 부모 포털로 이동해 학사 정보를 확인하세요.
            </p>
            <div className="flex flex-col gap-4">
              <Link
                href="/portal"
                prefetch={false}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-frage-blue text-frage-blue font-bold hover:bg-frage-blue hover:text-white transition-colors"
              >
                로그인 페이지로 이동
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
