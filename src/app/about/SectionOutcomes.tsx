"use client";

import Link from "next/link";

export default function SectionOutcomes() {
  const highlights = [
    { title: "유치부 Lexile 865 전국 최연소 · 최고점 기록", link: "https://blog.naver.com/frage_2030" },
    { title: "국제통번역자원봉사단 청소년 에세이 공모전 참가 학생 전원 수상", link: "https://blog.naver.com/frage_2030/223161007823" },
    { title: "전국 영어 말하기 대회 누적 750명 이상 출전", link: "https://blog.naver.com/frage_2030/222490002924" },
  ];
  return (
    <div className="container mx-auto max-w-5xl px-6 mt-12 space-y-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-frage-blue font-bold tracking-widest uppercase text-xs">Highlights</span>
            <h2 className="font-serif text-2xl md:text-3xl text-frage-navy font-bold mt-3">프라게 교육 시스템이 만들어낸 검증된 결과</h2>
          </div>
          <Link href="/outcomes" className="text-sm font-bold text-slate-500 hover:text-frage-blue">성과 전체 보기</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((h, i) => (
            <a key={i} href={h.link} target="_blank" rel="noreferrer" className="group rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
              <div className="h-32 bg-frage-blue/10"></div>
              <div className="p-4">
                <h3 className="font-bold text-frage-navy text-sm leading-tight">{h.title}</h3>
                <p className="text-xs text-slate-500 mt-2">블로그 새 탭 이동</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-10">
        <h3 className="font-serif text-2xl text-frage-navy font-bold mb-6">진학 성과</h3>
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
        <h3 className="font-serif text-2xl text-frage-navy font-bold mb-6">수상·대회 성과</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-slate-200 bg-frage-cream">전국 영어 말하기 대회 누적 750명+ 출전</div>
          <div className="p-6 rounded-2xl border border-slate-200 bg-frage-cream">숭실대 영어 말하기·영어 노래 대회 전원 수상</div>
          <div className="p-6 rounded-2xl border border-slate-200 bg-frage-cream">국제통번역자원봉사단 청소년 에세이 공모전 전원 수상</div>
          <a href="https://blog.naver.com/frage_2030/222042337775" target="_blank" rel="noreferrer" className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-frage-blue/30 transition-colors">2020 | 제2회 코드페어 알고리즘 히어로즈 전원 합격</a>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="http://pf.kakao.com/_QGQvxj/chat" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-frage-navy text-white text-sm font-bold hover:bg-slate-800">상담 예약하기</a>
          <Link href="/programs" className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white hover:bg-slate-50">프로그램 보기</Link>
        </div>
      </div>
    </div>
  );
}
