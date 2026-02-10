//app/admissions/page.tsx
import React from "react";
import Link from "next/link";
import { Youtube, BookOpen } from "lucide-react";

export default function AdmissionsPage() {
  return (
    <main className="min-h-screen bg-white pb-20">
      <section className="bg-frage-navy pt-24 pb-16 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">Admissions</h1>
          <p className="mt-4 text-frage-sand/80">Join the Frage community.</p>
        </div>
      </section>

      <section className="container mx-auto mt-16 max-w-3xl px-6">
        <div className="space-y-12">
          {/* Step 1 */}
          <div className="relative border-l-2 border-slate-200 pl-8 pb-8">
            <span className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-frage-primary ring-4 ring-white"></span>
            <h3 className="text-xl font-bold text-slate-900">1. 상담 예약 (Consultation)</h3>
            <p className="mt-2 text-slate-600">
              전화 또는 카카오톡 채널을 통해 방문 상담을 예약합니다. 아이의 현재 학습 상황과 목표에 대해 1차적인 논의가 이루어집니다.
            </p>
            <div className="mt-4">
              <Link href="/campuses" className="text-frage-primary font-semibold hover:underline">
                → 캠퍼스별 연락처 확인하기
              </Link>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative border-l-2 border-slate-200 pl-8 pb-8">
            <span className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-frage-accent ring-4 ring-white"></span>
            <h3 className="text-xl font-bold text-slate-900">2. 레벨 테스트 (Assessment)</h3>
            <p className="mt-2 text-slate-600">
              약 40~60분 소요되는 1:1 레벨 테스트를 진행합니다. (Phonics, Reading Comprehension, Speaking, Writing 전 영역 평가)
              <br />
              *테스트 비용이 발생할 수 있습니다.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative border-l-2 border-slate-200 pl-8 pb-8">
            <span className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-frage-navy ring-4 ring-white"></span>
            <h3 className="text-xl font-bold text-slate-900">3. 심층 상담 및 반 배정 (Placement)</h3>
            <p className="mt-2 text-slate-600">
              테스트 결과를 바탕으로 원장 또는 담당 선생님과 심층 상담을 진행하며, 아이의 성향과 수준에 가장 적합한 클래스를 배정합니다.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative pl-8">
            <span className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 ring-4 ring-white"></span>
            <h3 className="text-xl font-bold text-slate-900">4. 등록 및 등원 (Registration)</h3>
            <p className="mt-2 text-slate-600">
              수강 등록을 마치고, 지정된 날짜부터 수업에 참여합니다. 웰컴 키트와 함께 즐거운 프라게 생활이 시작됩니다.
            </p>
          </div>
        </div>

        <div className="mt-16 rounded-xl bg-frage-sand/50 p-8 text-center">
          <h3 className="mb-4 text-xl font-bold text-frage-navy">지금 바로 상담을 시작하세요</h3>
          <p className="mb-6 text-slate-600">
            가장 빠른 상담은 각 캠퍼스 카카오톡 채널을 통해 가능합니다.
          </p>
          <Link
            href="/campuses"
            className="inline-flex items-center justify-center rounded-lg bg-frage-primary px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-purple-800 transition-colors"
          >
            가까운 캠퍼스 찾기
          </Link>
        </div>
      </section>
      
      <section className="container mx-auto mt-12 max-w-3xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="https://blog.naver.com/prologue/PrologueList.naver?blogId=frage_2030&skinType=&skinId=&from=menu&userSelectMenu=true"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-4 hover:border-frage-primary hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-frage-navy/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-frage-navy" />
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-slate-900">프라게 블로그 구경하기</div>
              <div className="text-xs font-bold text-slate-500 mt-1">네이버 블로그에서 교육 철학과 소식을 만나보세요</div>
            </div>
          </a>
          <a
            href="https://www.youtube.com/@FRAGE_Edu/featured"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-4 hover:border-frage-primary hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center">
              <Youtube className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-slate-900">프라게 유튜브 구경하기</div>
              <div className="text-xs font-bold text-slate-500 mt-1">프라게 TV에서 프로그램과 학습 콘텐츠를 확인하세요</div>
            </div>
          </a>
        </div>
      </section>
    </main>
  );
}
