"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-frage-sand/30 pb-20">
      <section className="pt-32">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-[40px] font-black text-slate-900">
            {t.about_page.hero_title}
          </h1>
        </div>
      </section>

      <section className="container mx-auto mt-16 max-w-4xl px-6">
        <div className="space-y-12">
          <div className="rounded-2xl bg-white p-10 shadow-sm border border-slate-100">
            <h2 className="mb-6 text-2xl font-bold text-frage-primary">
              {t.about_page.section1_title}
            </h2>
            <div className="space-y-4 text-lg leading-relaxed text-slate-700">
              <p dangerouslySetInnerHTML={{ __html: t.about_page.section1_desc1 }} />
              <p dangerouslySetInnerHTML={{ __html: t.about_page.section1_desc2 }} />
            </div>
          </div>

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

      <section className="container mx-auto max-w-5xl px-6 mt-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <div className="text-2xl md:text-3xl font-black text-slate-900">같은 영어, 완전히 다른 교육의 방향</div>
          <div className="mt-4 text-slate-600">
            결과를 훈련하는 교육이 아닌,<br />생각하고 성장하는 영어 교육을 선택하세요.
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-6 mt-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-xs font-bold text-slate-500">비교 항목</div>
            <div className="text-xs font-bold text-slate-500">A학원</div>
            <div className="text-xs font-bold text-slate-500">프라게 어학원</div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-4 items-start">
              <div className="text-sm font-bold text-slate-700">학습 주체</div>
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">시스템과 교재 중심 수업</div>
              <div className="text-sm text-slate-900 rounded-lg p-3 border-2 border-frage-navy font-bold">학생과 교사의 역동적 상호작용 중심 수업</div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-start">
              <div className="text-sm font-bold text-slate-700">사고 방식</div>
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">지문 이해 및 문제 해결 위주</div>
              <div className="text-sm text-slate-900 rounded-lg p-3 border-2 border-frage-navy font-bold">질문을 통한 대안 제시와 비판적 사고 훈련</div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-start">
              <div className="text-sm font-bold text-slate-700">커리큘럼</div>
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">일반 아카데믹·시사 토픽 중심</div>
              <div className="text-sm text-slate-900 rounded-lg p-3 border-2 border-frage-navy font-bold">실제 사회 문제를 다루는 프로젝트 기반 학습</div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-start">
              <div className="text-sm font-bold text-slate-700">수업 목표</div>
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">지식과 표현의 정확성</div>
              <div className="text-sm text-slate-900 rounded-lg p-3 border-2 border-frage-navy font-bold">생각 → 표현 → 적용까지 연결되는 사고 구조 형성</div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-start">
              <div className="text-sm font-bold text-slate-700">평가 방식</div>
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">정기 테스트 및 레벨 평가 중심</div>
              <div className="text-sm text-slate-900 rounded-lg p-3 border-2 border-frage-navy font-bold">성장 포트폴리오 기반의 과정 중심 평가</div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-start">
              <div className="text-sm font-bold text-slate-700">학습 동기</div>
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">레벨 업과 점수에 대한 압박</div>
              <div className="text-sm text-slate-900 rounded-lg p-3 border-2 border-frage-navy font-bold">자기 성취감과 사회적 의미를 인식하는 학습 동기</div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-6 mt-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="text-lg font-bold text-frage-navy">우리는 아이를 점수로 평가하지 않습니다.</div>
          <div className="mt-4 text-slate-700 leading-relaxed">
            우리 학원은 아이가<br />무엇을 외웠는지가 아니라,<br /><br />
            어떤 질문을 했는지,<br />
            어떻게 생각을 확장했는지,<br />
            그 생각을 말과 글로 어떻게 표현했는지를<br />
            기록하고 성장시킵니다.<br /><br />
            영어는 목적이 아니라,<br />
            아이의 사고력을 키우는 도구이기 때문입니다.
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-6 mt-10">
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
      </section>

      <section className="container mx-auto max-w-5xl px-6 mt-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="space-y-2 text-sm text-slate-700">
            <div>✔ 시험 대비만으로는 부족하다고 느끼신다면</div>
            <div>✔ 아이가 질문하고 말하는 수업을 원하신다면</div>
            <div>✔ 성장 스토리를 통한 결과를 보고 싶다면</div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href="/about" className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white hover:bg-slate-50">교육 철학 더 알아보기</a>
            <a href="/programs" className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white hover:bg-slate-50">수업 방식 확인하기</a>
            <a href="/admissions" className="px-4 py-2 rounded-lg bg-frage-navy text-white text-sm font-bold hover:bg-slate-800">상담 예약하기</a>
          </div>
        </div>
      </section>

      
    </main>
  );
}
