"use client";

import React, { useEffect, useRef, useState } from "react";
import { HelpCircle, Brain, Presentation, Sparkles, Globe2, HeartHandshake } from "lucide-react";
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
            text: "Explaining ideas in English and responding to others with clarity",
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
            text: "자신의 생각을 영어로 설명하고 타인의 의견에 반응하며 확장하는 발표력",
          },
        ];

  const futureLearnerCards =
    isEn
      ? [
          {
            icon: Brain,
            title: "Critical Thinker",
            subtitle: "Children who craft questions and think logically about the world",
          },
          {
            icon: Sparkles,
            title: "Confident Communicator",
            subtitle: "Children who express their ideas in English with confidence",
          },
          {
            icon: Globe2,
            title: "Collaborative Global Citizen",
            subtitle: "Children who respect differences and collaborate with others",
          },
          {
            icon: HeartHandshake,
            title: "Positive Impact Maker",
            subtitle: "Children who connect learning to life and society",
          },
        ]
      : [
          {
            icon: Brain,
            title: "Critical Thinker",
            subtitle: "질문을 만들고 논리적으로 사고하는 아이",
          },
          {
            icon: Sparkles,
            title: "Confident Communicator",
            subtitle: "자신의 생각을 당당하게 표현하는 아이",
          },
          {
            icon: Globe2,
            title: "Collaborative Global Citizen",
            subtitle: "다름을 이해하고 협력하는 아이",
          },
          {
            icon: HeartHandshake,
            title: "Positive Impact Maker",
            subtitle: "배운 것을 삶과 사회에 연결하는 아이",
          },
        ];

  const outcomeBullets = isEn
    ? [
        "Designing their own questions and explaining them in English",
        "Thinking skills that connect to presentation, debate, and writing",
        "The attitude to respect others’ perspectives and coordinate opinions",
        "Leadership that appears naturally at school and in communities",
      ]
    : [
        "질문을 스스로 설계하고 영어로 설명하는 능력",
        "발표·토론·글쓰기로 연결되는 사고력",
        "타인의 관점을 존중하며 의견을 조율하는 태도",
        "학교·사회에서 리더십을 발휘하는 아이",
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

        <div className="mt-12 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-frage-navy/20 bg-frage-navy/5 px-6 py-5 text-center">
            <p className="text-sm md:text-base text-frage-navy font-semibold leading-relaxed">
              {isEn ? (
                <>
                  The power to ask, think, and present in English is not just language ability. It
                  becomes the thinking power to understand and change the world.
                </>
              ) : (
                <>
                  질문하고, 생각하고, 표현하는 힘은 단지 영어 실력이 아니라
                  <br className="hidden md:block" />
                  세상을 이해하고 변화시키는 사고력으로 확장됩니다.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8">
          <div className="text-xs font-bold tracking-[0.25em] uppercase text-frage-blue mb-3">
            EDUCATION MISSION
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-frage-navy mb-4">
            {isEn
              ? "Children who create positive impact with the power of thinking"
              : "생각하는 힘으로, 세상에 선한 영향을 주는 아이"}
          </h3>
          <p className="text-sm md:text-base text-slate-700 leading-relaxed">
            {isEn ? (
              <>
                At Frage, our goal is not simply to raise children who are good at English. We
                nurture future leaders who can express their thoughts, respect others’ ideas, and
                bring positive change to the world.
              </>
            ) : (
              <>
                프라게는 영어를 잘하는 아이가 아니라,
                <br className="hidden md:block" />
                자신의 생각을 언어로 표현하고
                <br className="hidden md:block" />
                타인의 생각을 존중하며
                <br className="hidden md:block" />
                세상에 긍정적인 변화를 만들어갈 수 있는
                <br className="hidden md:block" />
                미래 인재를 키웁니다.
              </>
            )}
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-bold tracking-[0.25em] uppercase text-frage-blue">
                FRAGE FUTURE LEARNER
              </div>
              <h3 className="mt-2 text-xl md:text-2xl font-bold text-frage-navy">
                {isEn ? "The type of learner we grow at Frage" : "프라게가 길러내는 아이의 모습"}
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {futureLearnerCards.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex gap-3"
                >
                  <div className="mt-1">
                    <Icon className="w-6 h-6 text-frage-navy" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-frage-navy">{c.title}</div>
                    <div className="mt-1 text-sm text-slate-700">{c.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8">
          <h3 className="text-xl md:text-2xl font-bold text-frage-navy mb-3">
            {isEn ? "Growth we envision through Frage’s education" : "프라게 교육이 그리는 성장의 방향"}
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            {isEn
              ? "We focus on the kind of growth that naturally appears in daily life, school, and society."
              : "프라게의 수업은 아이의 일상과 학교, 사회에서 자연스럽게 드러나는 성장을 지향합니다."}
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            {outcomeBullets.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-frage-blue" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
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
