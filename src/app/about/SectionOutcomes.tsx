"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import React, { useEffect, useRef, useState } from "react";

export default function SectionOutcomes({ showHighlights = true }: { showHighlights?: boolean }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [previews, setPreviews] = useState<Record<string, { image: string; title: string; description: string }>>({});
  const requestedRef = useRef<Record<string, boolean>>({});
  const highlights = [
    { title: "유치부 Lexile 865 전국 최연소 · 최고점 기록", link: "https://blog.naver.com/frage_2030/224113840941" },
    { title: "국제통번역자원봉사단 청소년 에세이 공모전 참가 학생 전원 수상", link: "https://blog.naver.com/frage_2030/223161007823" },
    { title: "전국 영어 말하기 대회 누적 750명 이상 출전", link: "https://blog.naver.com/frage_2030/222490002924" },
  ];
  useEffect(() => {
    highlights.forEach((h) => {
      const key = h.link;
      if (requestedRef.current[key]) return;
      requestedRef.current[key] = true;
      (async () => {
        try {
          const res = await fetch(`/api/og-preview?url=${encodeURIComponent(h.link)}`);
          const data = await res.json();
          setPreviews((prev) => ({
            ...prev,
            [key]: {
              image: String(data?.image || ""),
              title: String(data?.title || ""),
              description: String(data?.description || ""),
            },
          }));
        } catch {}
      })();
    });
  }, []);
  const awardSlides: {
    title: string;
    desc?: string;
    link?: string;
    images: string[];
  }[] = [
    {
      title: "전국 영어 말하기 대회",
      desc: "프라게 학생 누적 750명 이상 출전",
      link: "https://blog.naver.com/frage_2030/222490002924",
      images: [
        "/images/outcome-award-speech-2019-1.jpg",
        "/images/outcome-award-speech-2019-2.jpg",
        "/images/outcome-award-speech-2025-1.jpg",
      ],
    },
    {
      title: "숭실대영어말하기및영어노래대회",
      desc: "숭실대학교 총장님 상 수상",
      link: "https://blog.naver.com/frage_2030/223714898433",
      images: ["/images/soongsil_1.jpg", "/images/soongsil_2.jpg", "/images/soongsil_3.jpg"],
    },
    {
      title: "유엔NGO FLML 미국 국제교류 청소년 사절단",
      desc: "친선 국제 스피치 대회",
      images: ["images/usa_1.jpg", "images/usa_2.jpg", "images/usa_3.jpg"],
    },
    {
      title: "제54회 코리아헤럴드영어스피치대회",
      images: ["/images/heraldspeech_1.jpg", "/images/heraldspeech_2.jpg", "/images/heraldspeech_3.jpg"],
    },
    {
      title: "KIECC UN SDGs 영어말하기대회",
      desc: "본선 진출",
      images: ["/images/sdg_1.jpg", "/images/sdg_2.jpg", "/images/sdg_3.jpg"],
    },
    {
      title: "진주 K-기업가정신 국제포럼",
      desc: "전국 청소년 영어 스피치 특별무대",
      link: "https://n.news.naver.com/article/422/0000797218",
      images: ["/images/jinju_1.jpg", "/images/jinju_2.jpg", "/images/jinju_3.jpg"],
    },
    {
      title: "세계창의력올림피아드국가대표 선발",
      desc: "초등부팀 금상/은상 수상, 고등부팀 금상 수상",
      link: "https://blog.naver.com/frage_2030/221224864028",
      images: ["/images/odyssey_1.jpg", "/images/odyssey_2.jpg", "/images/odyssey_3.jpg"],
    },
    {
      title: "비영리국제기구 WAC 공인 한국학생 융합과학대회",
      desc: "전원수상",
      link: "https://blog.naver.com/frage_2030/223103066382",
      images: ["/images/deca_1.jpg", "/images/deca_2.jpg", "/images/deca_3.jpg"],
    },
    {
      title: "2023 세계학생 창의력 올림피아드",
      desc: "골드버그 1등상 및 개인창의력부분 1등상",
      link: "https://blog.naver.com/frage_2030/223205323400",
      images: ["/images/credeca-1.jpg", "/images/credeca-2.jpg", "/images/credeca-3.jpg"],
    },
  ];
  return (
    <div className="container mx-auto max-w-5xl px-6 mt-12 space-y-12">
      {showHighlights && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-frage-blue font-bold tracking-widest uppercase text-xs">
                {isEn ? "Highlights" : "Highlights"}
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-frage-navy font-bold mt-3">
                {isEn ? "Verified outcomes created by Frage’s education system" : "프라게 교육 시스템이 만들어낸 검증된 결과"}
              </h2>
            </div>
            <span className="text-sm font-bold text-slate-500">{isEn ? "Preview" : "성과 미리보기"}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map((h, i) => (
              <a key={i} href={h.link} target="_blank" rel="noreferrer" className="group rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                <div className="aspect-video bg-slate-100">
                  {previews[h.link]?.image ? (
                    <img
                      src={previews[h.link].image}
                      alt={h.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 animate-pulse" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-frage-navy text-sm leading-tight">{h.title}</h3>
                  <p className="text-xs text-slate-500 mt-2">{isEn ? "Open blog in new tab" : "블로그 새 탭 이동"}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-10">
        <h3 className="font-serif text-2xl text-frage-navy font-bold mb-6">
          {isEn ? "Admission Outcomes" : "진학 성과"}
        </h3>
        <div className="space-y-8">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-6 items-center">
            {[
              { src: "/images/about/branksome.png", name: "Branksome Hall Asia" },
              { src: "/images/about/purdue.png", name: "Purdue University" },
              { src: "/images/about/columbia.png", name: "Columbia University" },
              { src: "/images/about/ucla.png", name: "University of California Los Angeles" },
              { src: "/images/about/michigan.png", name: "University of Michigan" },
              { src: "/images/about/bu.png", name: "Boston University" },
              { src: "/images/about/hawaii.png", name: "University of Hawaii Manoa" },
              { src: "/images/about/dis.svg", name: "Daegu International School" },
              { src: "/images/about/kis.png", name: "Korea International School" },
              { src: "/images/about/%EB%8C%80%EA%B5%AC%EA%B5%AD%EC%A0%9C%EA%B3%A0.png", name: "Daegu International High School" },
              { src: "/images/about/%EB%8C%80%EA%B5%AC%EC%99%B8%EA%B3%A0.png", name: "Daegu Foreign Language High School" },
              { src: "/images/about/%EC%9A%A9%EC%9D%B8%EC%99%B8%EA%B3%A0.png", name: "Yongin Foreign Language High School" },
            ].map((logo, i) => (
              <div key={i} className="flex items-center justify-center">
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="h-14 w-auto object-contain"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { year: 2025, ko: "Columbia University 합격", en: "Columbia University admitted" },
              { year: 2024, ko: "Purdue University 합격", en: "Purdue University admitted" },
              { year: 2023, ko: "University of California Los Angeles 합격", en: "University of California Los Angeles admitted" },
              { year: 2023, ko: "Daegu International School 합격", en: "Daegu International School admitted" },
              { year: 2022, ko: "Branksome Hall Asia 합격", en: "Branksome Hall Asia admitted" },
              { year: 2022, ko: "Boston University 합격", en: "Boston University admitted" },
              { year: 2021, ko: "Daegu International School 합격", en: "Daegu International School admitted" },
              { year: 2018, ko: "University of Hawaii Manoa 합격", en: "University of Hawaii Manoa admitted" },
              { year: 2020, ko: "University of Michigan 합격", en: "University of Michigan admitted" },
            ].map((item, i) => (
              <div key={i} className="text-sm text-slate-700">
                {item.year} | {isEn ? item.en : item.ko}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-2xl text-frage-navy font-bold">
            {isEn ? "Awards & Competitions" : "수상·대회 성과"}
          </h3>
          <span className="text-sm text-slate-500">
            {isEn ? "Frage students’ achievements in competitions" : "대회·공모전에서 증명된 성과"}
          </span>
        </div>
        <AwardsCarousel slides={awardSlides} isEn={isEn} />
      </div>

      

      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="http://pf.kakao.com/_QGQvxj/chat" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-frage-navy text-white text-sm font-bold hover:bg-slate-800">
            {isEn ? "Inquire" : "상담 예약하기"}
          </a>
          <Link href="/programs" className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white hover:bg-slate-50">
            {isEn ? "View Programs" : "프로그램 보기"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function AwardsCarousel({
  slides,
  isEn,
}: {
  slides: { title: string; desc?: string; link?: string; images: string[] }[];
  isEn: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const startXRef = useRef<number | null>(null);

  useEffect(() => {
    if (hovering) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 7000);
    return () => clearInterval(id);
  }, [hovering, slides.length]);

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <div
      className="relative group overflow-hidden rounded-2xl border border-slate-200"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onTouchStart={(e) => {
        startXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const endX = e.changedTouches[0]?.clientX ?? null;
        if (startXRef.current !== null && endX !== null) {
          const delta = endX - startXRef.current;
          if (Math.abs(delta) > 50) {
            if (delta < 0) next();
            else prev();
          }
        }
        startXRef.current = null;
      }}
    >
      <div className="relative h-full min-h-[420px]">
        {slides.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              i === index ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {s.images.slice(0, 3).map((src, k) => (
                  <div key={k} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={src}
                        alt={`${s.title} ${k + 1}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 px-1">
                <div className="font-serif text-lg font-bold text-frage-navy">{s.title}</div>
                {s.desc && <div className="text-sm text-slate-600 mt-1">{s.desc}</div>}
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 mt-2 inline-block"
                  >
                    {isEn ? "Open blog in new tab" : "블로그 새 탭 이동"}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        aria-label="Previous"
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/70 backdrop-blur p-2 shadow-sm text-frage-navy opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ‹
      </button>
      <button
        aria-label="Next"
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/70 backdrop-blur p-2 shadow-sm text-frage-navy opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ›
      </button>
    </div>
  );
}
