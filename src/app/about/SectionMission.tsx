"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function SectionMission() {
  const { t } = useLanguage();
  return (
    <div className="container mx-auto max-w-5xl px-6 mt-12 space-y-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-10">
        <h3 className="mb-4 text-xl font-bold text-frage-navy">
          {t.about_page.section3_title}
        </h3>
        <p className="text-slate-600 leading-relaxed">
          {t.about_page.section3_desc}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-sm font-bold text-slate-900">신뢰 강화 포인트</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-slate-700"><span className="text-frage-gold">✔</span> 과정 중심 평가</div>
          <div className="flex items-center gap-2 text-slate-700"><span className="text-frage-gold">✔</span> 누적 성장 기록</div>
          <div className="flex items-center gap-2 text-slate-700"><span className="text-frage-gold">✔</span> 프로젝트 기반 수업</div>
          <div className="flex items-center gap-2 text-slate-700"><span className="text-frage-gold">✔</span> 질문 중심 토론 수업</div>
          <div className="flex items-center gap-2 text-slate-700"><span className="text-frage-gold">✔</span> 포트폴리오 관리</div>
        </div>
      </div>
    </div>
  );
}
