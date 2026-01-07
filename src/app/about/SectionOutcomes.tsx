"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import React, { useEffect, useRef, useState } from "react";

export default function SectionOutcomes({ expanded = false }: { expanded?: boolean }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const highlights = [
    { title: "유치부 Lexile 865 전국 최연소 · 최고점 기록", link: "https://blog.naver.com/frage_2030" },
    { title: "국제통번역자원봉사단 청소년 에세이 공모전 참가 학생 전원 수상", link: "https://blog.naver.com/frage_2030/223161007823" },
    { title: "전국 영어 말하기 대회 누적 750명 이상 출전", link: "https://blog.naver.com/frage_2030/222490002924" },
  ];
  const archives = [
    { title: "Daegu International School 합격 사례", link: "https://blog.naver.com/frage_2030/223017626733" },
    { title: "Branksome Hall Asia 합격 사례", link: "https://blog.naver.com/frage_2030/222844192256" },
    { title: "대구국제고 최종 합격 사례", link: "https://blog.naver.com/frage_2030/223743723260" },
    { title: "Purdue University 합격 사례", link: "https://blog.naver.com/frage_2030/224078411287" },
    { title: "영어 말하기 대회 출전 기록", link: "https://blog.naver.com/frage_2030/222490002924" },
    { title: "에세이 공모전 전원 수상 상세", link: "https://blog.naver.com/frage_2030/223161007823" },
  ];
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
      images: ["/images/jinu_1.jpg", "/images/jinu_2.jpg", "/images/jinu_3.jpg"],
    },
    {
      title: "세계창의력올림피아드국가대표 선발",
      desc: "초등부팀 금상/은상 수상, 고등부팀 금상 수상",
      link: "https://blog.naver.com/frage_2030/221224864028",
      images: ["/images/odysessy_1.jpg", "/images/odysessy_2.jpg", "/images/odysessy_3.jpg"],
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
              <div className="h-32 bg-frage-blue/10"></div>
              <div className="p-4">
                <h3 className="font-bold text-frage-navy text-sm leading-tight">{h.title}</h3>
                <p className="text-xs text-slate-500 mt-2">{isEn ? "Open blog in new tab" : "블로그 새 탭 이동"}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-10">
        <h3 className="font-serif text-2xl text-frage-navy font-bold mb-6">{isEn ? "Admission Outcomes" : "진학 성과"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <a href="https://blog.naver.com/frage_2030/223017626733" target="_blank" rel="noreferrer" className="block p-4 bg-white rounded-xl border border-gray-200 hover:border-frage-blue/30 transition-colors">2023 | Daegu International School 프라게 초등 국제반 합격</a>
            <a href="https://blog.naver.com/frage_2030/222844192256" target="_blank" rel="noreferrer" className="block p-4 bg-white rounded-xl border border-gray-200 hover:border-frage-blue/30 transition-colors">2022 | Branksome Hall Asia (제주 국제학교) 합격</a>
            <a href="https://blog.naver.com/frage_2030/223743723260" target="_blank" rel="noreferrer" className="block p-4 bg-white rounded-xl border border-gray-200 hover:border-frage-blue/30 transition-colors">2025 | 대구국제고등학교 최종 합격</a>
          </div>
          <div className="space-y-3">
            <a href="https://blog.naver.com/frage_2030/224078411287" target="_blank" rel="noreferrer" className="block p-4 bg-white rounded-xl border border-gray-200 hover:border-frage-blue/30 transition-colors">2024 | Purdue University 합격</a>
            <div className="p-4 bg-white rounded-xl border border-gray-200">2025 | Columbia University 합격</div>
            <div className="p-4 bg-white rounded-xl border border-gray-200">2020 | University of Michigan 합격</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-2xl text-frage-navy font-bold">
            {isEn ? "Awards & Competitions" : "수상·대회 성과"}
          </h3>
          <span className="text-sm text-slate-500">
            {isEn ? "Frage students’ achievements in real competitions" : "실제 대회·공모전에서 증명된 성과"}
          </span>
        </div>
        <AwardsCarousel slides={awardSlides} isEn={isEn} />
      </div>

      {expanded && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-frage-blue font-bold tracking-widest uppercase text-xs">
                {isEn ? "Outcomes Archive" : "성과 아카이브"}
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-frage-navy font-bold mt-3">
                {isEn ? "View more real records" : "실제 기록 더 보기"}
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {archives.map((a, i) => (
              <a key={i} href={a.link} target="_blank" rel="noreferrer" className="group rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                <div className="h-24 bg-frage-gold/10"></div>
                <div className="p-4">
                  <h3 className="font-bold text-frage-navy text-sm leading-tight">{a.title}</h3>
                  <p className="text-xs text-slate-500 mt-2">{isEn ? "Open blog in new tab · Latest" : "블로그 새 탭 이동 · 최신순"}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

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
