"use client";

import React, { useEffect, useRef, useState } from "react";
import { HelpCircle, Brain, Presentation } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function SectionMission() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const missionRef = useRef<HTMLParagraphElement>(null);
  const pillarsRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState({
    headline: false,
    sub: false,
    mission: false,
    pillars: false,
  });

  useEffect(() => {
    const targets: Array<[Element | null, keyof typeof visible, number]> = [
      [headlineRef.current, "headline", 0],
      [subRef.current, "sub", 100],
      [missionRef.current, "mission", 200],
      [pillarsRef.current, "pillars", 300],
    ];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = targets.findIndex(([el]) => el === entry.target);
          if (idx >= 0 && entry.isIntersecting) {
            const key = targets[idx][1];
            const delay = targets[idx][2];
            setTimeout(() => {
              setVisible((v) => ({ ...v, [key]: true }));
            }, delay);
          }
        });
      },
      { threshold: 0.2 }
    );
    targets.forEach(([el]) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const cards =
    isEn
      ? [
          {
            icon: HelpCircle,
            label: "Question",
            title: "Ask",
            text: "The power to craft questions rather than chase answers",
          },
          {
            icon: Brain,
            label: "Think",
            title: "Think",
            text: "Structuring thoughts and articulating them with language",
          },
          {
            icon: Presentation,
            label: "Present",
            title: "Present",
            text: "Explaining ideas in English and responding with clarity",
          },
        ]
      : [
          {
            icon: HelpCircle,
            label: "Question",
            title: "Ask",
            text: "정답을 찾기보다 질문을 만드는 힘",
          },
          {
            icon: Brain,
            label: "Think",
            title: "Think",
            text: "생각을 구조화하고 언어로 정리하는 사고력",
          },
          {
            icon: Presentation,
            label: "Present",
            title: "Present",
            text: "자신의 생각을 영어로 설명하고 반응하는 발표력",
          },
        ];

  return (
    <section className="bg-[#F7F4EF]">
      <div className="container mx-auto max-w-5xl px-6 py-16">
        <div
          ref={headlineRef}
          className={`text-center transition-all duration-700 ease-out ${
            visible.headline ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-frage-navy leading-snug">
            {isEn ? (
              <>
                We nurture children who think in English,
                <br className="hidden md:block" />
                not just speak.
              </>
            ) : (
              <>
                영어로 말하는 아이가 아니라,
                <br className="hidden md:block" />
                영어로 생각하는 아이를 키웁니다.
              </>
            )}
          </h2>
        </div>

        <div
          ref={subRef}
          className={`mt-4 text-center transition-all duration-700 ease-out ${
            visible.sub ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          <p className="text-slate-600">
            {isEn ? (
              <>
                Not a listen-and-repeat class,
                <br className="hidden md:block" />
                but a Havruta-style class that asks, thinks, presents, and responds.
              </>
            ) : (
              <>
                듣고 따라 하는 수업이 아닌,
                <br className="hidden md:block" />
                묻고 · 생각하고 · 발표하는 하브루타식 영어수업
              </>
            )}
          </p>
        </div>

        <div
          ref={missionRef}
          className={`mt-8 transition-all duration-700 ease-out ${
            visible.mission ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
            <p className="text-slate-700 leading-relaxed text-center">
              {isEn
                ? "Frage's classes begin with a question. Students organize their thoughts and present in English, then expand their thinking by questioning peers’ ideas. English becomes a tool of communication, not just a subject."
                : "프라게의 수업은 질문에서 시작합니다. 아이들은 자신의 생각을 정리해 영어로 발표하고, 친구의 의견에 다시 질문하며 사고를 확장합니다. 영어는 과목이 아니라, 소통의 도구가 됩니다."}
            </p>
          </div>
        </div>

        <div
          ref={pillarsRef}
          className={`mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-700 ease-out ${
            visible.pillars ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-7 h-7 text-frage-navy" strokeWidth={1.5} />
                  <div className="text-xs font-bold tracking-widest uppercase text-frage-blue">
                    {isEn ? c.label : c.label}
                  </div>
                </div>
                <h3 className="mt-4 font-serif text-xl font-bold text-frage-navy">
                  {isEn ? c.title : c.title}
                </h3>
                <p className="mt-2 text-slate-700">{c.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-frage-navy hover:text-slate-800 transition-colors"
          >
            {isEn ? "Learn more about our class method →" : "프라게의 수업 방식 더 알아보기 →"}
          </Link>
        </div>
      </div>
    </section>
  );
}
