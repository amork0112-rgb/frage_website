"use client";
import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function ProgramsPage() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const accent = {
    navy: "bg-frage-navy text-white",
    teal: "bg-teal-600 text-white",
    blue: "bg-blue-600 text-white",
    slate: "bg-slate-800 text-white"
  };

  const juniorStages = isEn
    ? [
        { tag: "Root", color: "bg-emerald-50 text-emerald-700", keywords: "PHONICS · LISTENING · SPEAKING", desc: "Foundational skills in sound, listening, and speaking" },
        { tag: "Ground up", color: "bg-cyan-50 text-cyan-700", keywords: "GRAMMAR · WRITING · STRUCTURE", desc: "Build sentence, paragraph, and logical structure" },
        { tag: "Power up", color: "bg-sky-50 text-sky-700", keywords: "READING · SUMMARY · EXPRESSION", desc: "Expand reading comprehension, summarizing, and expression" },
        { tag: "Asset", color: "bg-indigo-50 text-indigo-700", keywords: "CRITICAL READING · ESSAY · PRESENTATION", desc: "Advanced reading, essay writing, and presentation" }
      ]
    : [
        { tag: "Root", color: "bg-emerald-50 text-emerald-700", keywords: "PHONICS · LISTENING · SPEAKING", desc: "소리·말 중심 기초 형성" },
        { tag: "Ground up", color: "bg-cyan-50 text-cyan-700", keywords: "GRAMMAR · WRITING · STRUCTURE", desc: "문장·단락·논리 구축" },
        { tag: "Power up", color: "bg-sky-50 text-sky-700", keywords: "READING · SUMMARY · EXPRESSION", desc: "독해 요약과 표현 확장" },
        { tag: "Asset", color: "bg-indigo-50 text-indigo-700", keywords: "CRITICAL READING · ESSAY · PRESENTATION", desc: "고급 독해 · 에세이 · 발표" }
      ];

  const kinderStages = isEn
    ? [
        { tag: "Little FRAGE", color: "bg-amber-50 text-amber-700", keywords: "PLAY · EXPOSURE · CONFIDENCE", desc: "Play-based English exposure for natural acquisition" },
        { tag: "FRAGE Kinder", color: "bg-orange-50 text-orange-700", keywords: "PHONICS READY · SENTENCE · THINKING", desc: "Lay foundations for sentences and thinking" },
        { tag: "Premier", color: "bg-fuchsia-50 text-fuchsia-700", keywords: "READING HABIT · SPEAKING", desc: "Expand English thinking with US/IB curriculum" },
        { tag: "Asset", color: "bg-indigo-50 text-indigo-700", keywords: "CRITICAL READING · ESSAY · PRESENTATION", desc: "Advanced reading, essay writing, and presentation" }
      ]
    : [
        { tag: "Little FRAGE", color: "bg-amber-50 text-amber-700", keywords: "PLAY · EXPOSURE · CONFIDENCE", desc: "놀이 기반 영어 노출" },
        { tag: "FRAGE Kinder", color: "bg-orange-50 text-orange-700", keywords: "PHONICS READY · SENTENCE · THINKING", desc: "문장과 사고력의 초석" },
        { tag: "Premier", color: "bg-fuchsia-50 text-fuchsia-700", keywords: "READING HABIT · SPEAKING", desc: "미국교과서 및 IB교육으로 영어 사고력 확장" },
        { tag: "Asset", color: "bg-indigo-50 text-indigo-700", keywords: "CRITICAL READING · ESSAY · PRESENTATION", desc: "고급 독해 · 에세이 · 발표" }
      ];

  return (
    <main className="min-h-screen pb-24 bg-white">
      <section className="pt-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900">{isEn ? "Frage Programs" : "프라게 프로그램"}</h1>
            <p className="mt-3 text-sm text-slate-600">
              {isEn ? "A staged roadmap tailored to your child's level and goals" : "아이의 현재와 목표에 맞춘 단계형 로드맵"}
            </p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <ProgramTrack
              title={isEn ? "Frage Core Track" : "프라게 Core 과정"}
              subtitle={isEn ? "Elementary · Secondary Unified" : "초등 · 중등 통합 학령"}
              badgeClass={accent.navy}
              stages={juniorStages}
              footer={isEn ? "Operated in level bands: E1–G4 → A1–A5 → F1–F5." : "E1~G4 → A1~A5 → F1~F5의 레벨 밴드로 운영됩니다."}
            />
            <ProgramTrack
              title={isEn ? "Frage Quantum Track" : "프라게 Quantum 과정"}
              subtitle={isEn ? "Kindergarten · Early Elementary" : "유치 · 초저 학령"}
              badgeClass={accent.slate}
              stages={kinderStages}
              footer={isEn ? "Operated in level bands: R1–R4 → F1–F5." : "R1~R4 → F1~F5의 레벨 밴드로 운영됩니다."}
            />
          </div>
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <div className="text-sm font-bold text-slate-900">Fradis</div>
            <div className="mt-2 text-sm text-slate-600">
              {isEn
                ? "Preparation for secondary track · essay evaluation · advanced reading/writing · international school/study abroad"
                : "중학 과정 준비 · 논서술 평가 · 고급 독해/작문 · 국제학교/유학 트랙"}
            </div>
          </div>
          <div className="mt-10 text-center">
            <div className="text-sm font-bold text-slate-900">{isEn ? "Personalized Guidance" : "개별 맞춤 안내"}</div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <a href="/signup" className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white hover:bg-slate-50">
                {isEn ? "Level Test" : "레벨 테스트"}
              </a>
              <a href="/admissions" className="px-4 py-2 rounded-lg bg-frage-navy text-white text-sm font-bold hover:bg-slate-800">
                {isEn ? "Admission Inquiry" : "상담 신청"}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProgramTrack({
  title,
  subtitle,
  badgeClass,
  stages,
  footer
}: {
  title: string;
  subtitle: string;
  badgeClass: string;
  stages: { tag: string; color: string; keywords: string; desc: string }[];
  footer: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-500">{subtitle}</div>
          <h2 className="mt-1 text-xl font-black text-slate-900">{title}</h2>
        </div>
        <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold ${badgeClass}`}>Roadmap</span>
      </div>
      <div className="mt-5 space-y-3">
        {stages.map((s) => (
          <div key={s.tag} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 rounded text-[11px] font-bold ${s.color}`}>{s.tag}</span>
              <span className="text-[11px] font-bold tracking-widest text-slate-500">{s.keywords}</span>
            </div>
            <div className="mt-2 text-sm text-slate-700">{s.desc}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-slate-500">{footer}</div>
    </div>
  );
}
