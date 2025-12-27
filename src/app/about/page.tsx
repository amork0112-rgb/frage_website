"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-frage-sand/30 pb-20">
      {/* Hero Section */}
      <section className="relative bg-frage-navy py-20 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="mb-4 text-3xl font-bold md:text-4xl">
            {t.about_page.hero_title}
          </h1>
          <p className="text-frage-sand/80">
            {t.about_page.hero_subtitle}
          </p>
        </div>
      </section>

      {/* Philosophy Content */}
      <section className="container mx-auto mt-16 max-w-4xl px-6">
        <div className="space-y-12">
          {/* Core Philosophy */}
          <div className="rounded-2xl bg-white p-10 shadow-sm border border-slate-100">
            <h2 className="mb-6 text-2xl font-bold text-frage-primary">
              {t.about_page.section1_title}
            </h2>
            <div className="space-y-4 text-lg leading-relaxed text-slate-700">
              <p dangerouslySetInnerHTML={{ __html: t.about_page.section1_desc1 }} />
              <p dangerouslySetInnerHTML={{ __html: t.about_page.section1_desc2 }} />
            </div>
          </div>

          {/* Director's Message */}
          <div className="grid gap-10 md:grid-cols-2 items-center">
            <div className="order-2 md:order-1">
              <h3 className="mb-4 text-xl font-bold text-frage-navy">
                {t.about_page.section2_title}
              </h3>
              <div className="text-slate-600 leading-relaxed space-y-4">
                <p dangerouslySetInnerHTML={{ __html: t.about_page.section2_desc1 }} />
                <p dangerouslySetInnerHTML={{ __html: t.about_page.section2_desc2 }} />
              </div>
            </div>
            <div className="order-1 md:order-2 h-64 rounded-xl bg-frage-forest/10 flex items-center justify-center text-frage-forest font-serif italic text-xl p-8 text-center">
              {t.about_page.quote}
            </div>
          </div>

          {/* Evaluation System */}
          <div className="rounded-2xl bg-slate-50 p-10 border border-slate-200">
            <h3 className="mb-4 text-xl font-bold text-frage-navy">
              {t.about_page.section3_title}
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {t.about_page.section3_desc}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}