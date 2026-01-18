"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function SectionGrowth() {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const flow = isEn ? ["Ask", "Think", "Speak", "Write", "Record", "Feedback"] : ["질문", "사고", "말", "글", "기록", "피드백"];
  return (
    <div className="container mx-auto max-w-5xl px-6 mt-12 space-y-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="text-2xl md:text-3xl font-black text-slate-900">
          {isEn ? "Same English, a completely different direction in education" : "같은 영어, 완전히 다른 교육의 방향"}
        </div>
        <div className="mt-4 text-slate-600">
          {isEn ? (
            <>
              Choose English education that fosters thinking and growth,
              <br />
              not training for outcomes.
            </>
          ) : (
            <>
              결과를 훈련하는 교육이 아닌,<br />생각하고 성장하는 영어 교육을 선택하세요.
            </>
          )}
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
        <div className="text-sm font-bold text-frage-navy mb-4">{isEn ? "Growth Flow" : "성장 흐름"}</div>
        <div className="flex flex-wrap items-center gap-3">
          {flow.map((f) => (
            <div
              key={f}
              className="px-3 py-1 rounded-full bg-frage-cream text-frage-navy text-sm font-bold"
            >
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 md:p-10">
        <div className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold tracking-wide text-frage-navy">
                {isEn ? "Student Management System" : "학생 관리 시스템"}
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900 md:text-xl">
                {isEn
                  ? "One continuous view of growth, from class to home"
                  : "교실에서 집까지 하나로 이어지는 성장 설계"}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {isEn
                ? "Ask · Think · Speak · Write · Record · Feedback"
                : "질문 · 사고 · 말 · 글 · 기록 · 피드백"}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-5">
              <div className="text-xs font-semibold text-slate-500">
                {isEn ? "In Class" : "수업에서"}
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {isEn ? "Questions and tasks are designed" : "질문과 과제가 설계됩니다"}
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div>{isEn ? "Weekly objectives are set" : "주간 학습 목표 설정"}</div>
                <div>{isEn ? "Teacher guides Ask · Think" : "교사가 질문과 사고를 이끕니다"}</div>
                <div>{isEn ? "Speaking and writing tasks are given" : "말하기·쓰기 과제가 제시됩니다"}</div>
              </div>
              <div className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700">
                {isEn ? "Teacher input" : "교사 입력"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
              <div className="text-xs font-semibold text-slate-500">
                {isEn ? "On Frage Platform" : "프라게 플랫폼"}
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {isEn ? "Every activity is turned into data" : "모든 활동이 데이터로 남습니다"}
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div>
                  {isEn
                    ? "Ask · Think · Speak · Write are recorded with time and level"
                    : "질문·사고·말·글 활동이 시간·수준과 함께 기록"}
                </div>
                <div>
                  {isEn
                    ? "Growth patterns are visualized week by week"
                    : "주차별 성장 패턴이 시각화"}
                </div>
                <div>
                  {isEn
                    ? "Alerts for missing submissions and sudden changes"
                    : "과제 미제출·급격한 변화에 대한 알림"}
                </div>
              </div>
              <div className="mt-4 inline-flex items-center rounded-full border border-frage-navy/20 bg-frage-navy/5 px-3 py-1 text-[11px] font-medium text-frage-navy">
                {isEn ? "Central growth timeline" : "중앙 성장 타임라인"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-5">
              <div className="text-xs font-semibold text-slate-500">
                {isEn ? "Home · School" : "집 · 학교"}
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-900">
                {isEn ? "Clear reports and next steps" : "명확한 리포트와 다음 단계"}
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div>
                  {isEn
                    ? "Parents see what was asked and how student responded"
                    : "학부모는 어떤 질문에 어떻게 답했는지 확인"}
                </div>
                <div>
                  {isEn
                    ? "Teachers share notes with homeroom and admins"
                    : "교사가 담임·운영진과 노트를 공유"}
                </div>
                <div>
                  {isEn
                    ? "Next week plan is aligned across class and home"
                    : "다음 주 계획이 교실과 집에서 함께 맞춰집니다"}
                </div>
              </div>
              <div className="mt-4 inline-flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                  {isEn ? "Parent view" : "학부모 뷰"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                  {isEn ? "School view" : "학교 뷰"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {isEn ? "Weekly loop" : "주간 루프"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {isEn ? "From activity to data to insight" : "활동에서 데이터, 데이터에서 인사이트로"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {isEn ? "Designed for long-term growth" : "장기 성장을 전제로 한 설계"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
