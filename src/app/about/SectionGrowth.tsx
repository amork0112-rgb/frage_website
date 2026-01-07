"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function SectionGrowth() {
  const { t } = useLanguage();
  const flow = ["질문", "사고", "말", "글", "기록", "피드백"];
  return (
    <div className="container mx-auto max-w-5xl px-6 mt-12 space-y-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="text-2xl md:text-3xl font-black text-slate-900">같은 영어, 완전히 다른 교육의 방향</div>
        <div className="mt-4 text-slate-600">
          결과를 훈련하는 교육이 아닌,<br />생각하고 성장하는 영어 교육을 선택하세요.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-10">
        <h3 className="mb-4 text-xl font-bold text-frage-navy">{t.about_page.section2_title}</h3>
        <div className="text-slate-600 leading-relaxed space-y-4">
          <p dangerouslySetInnerHTML={{ __html: t.about_page.section2_desc1 }} />
          <p dangerouslySetInnerHTML={{ __html: t.about_page.section2_desc2 }} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-sm font-bold text-frage-navy mb-4">성장 흐름</div>
        <div className="flex flex-wrap items-center gap-3">
          {flow.map((f) => (
            <div key={f} className="px-3 py-1 rounded-full bg-frage-cream text-frage-navy text-sm font-bold">
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
