import React from "react";
import { Sprout, BookOpen, MessageSquare, PenTool, GraduationCap, Type, BadgeCheck, Globe } from "lucide-react";

export default function ProgramsPage() {
  const colors = {
    bg: "#FBF4E8",
    ivy: "#7A8F57",
    soft: "#C9D5B3",
    olive: "#5E7344",
    navy: "#0E2340",
    gold: "#D7B76E",
    card: "#FFFDF6",
    border: "#E9E4D4",
    text: "#2F3E1D",
    sub: "#5F6B4C",
  };

  return (
    <main className="min-h-screen pb-24" style={{ backgroundColor: colors.bg }}>
      <section className="pt-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="mt-2 text-3xl md:text-4xl font-bold" style={{ color: colors.text }}>
            커리큘럼
          </h1>
          <div className="mt-6 rounded-2xl mx-auto max-w-xl p-5" style={{ backgroundColor: colors.card }}>
            <div className="text-sm font-bold uppercase tracking-wider" style={{ color: colors.olive }}>
              Where the Journey Begins
            </div>
            <p className="mt-2 text-sm" style={{ color: colors.sub }}>
              단계별로 체계화된 프라게만의 커리큘럼을 소개합니다. 언어 습득의 원리를 기반으로 설계되었습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="relative max-w-3xl mx-auto mt-10 px-6">
        <div className="relative h-[1400px] mx-auto">
          <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 360 1400" preserveAspectRatio="none">
            <path
              d="M180 80 C 140 120, 110 180, 110 260 L 110 600 C 110 720, 150 780, 180 820"
              fill="none"
              stroke={colors.olive}
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M180 80 C 220 120, 250 180, 250 260 L 250 600 C 250 720, 210 780, 180 820"
              fill="none"
              stroke={colors.ivy}
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M180 820 L 180 1260"
              fill="none"
              stroke={colors.soft}
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M180 820 L 180 1260"
              fill="none"
              stroke={colors.olive}
              strokeWidth="3"
              strokeDasharray="8 8"
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0">
            <div className="absolute left-[10px] md:left-[0px]" style={{ top: "160px" }}>
              <TrackCard icon={Sprout} title="Little FRAGE (4–5)" keywords="Play · Exposure · Confidence" desc="놀이 기반 영어 노출" color="#BFD8B8" />
            </div>
            <div className="absolute left-[10px] md:left-[0px]" style={{ top: "320px" }}>
              <TrackCard icon={BookOpen} title="FRAGE Kinder (5–7)" keywords="Phonics Ready · Sentence · Thinking" desc="놀이 → 학습 전환" color="#D8EAD3" />
            </div>
            <div className="absolute left-[26px]" style={{ top: "470px" }}>
              <Badge label="Fast Track" sub="Early Language Foundation Completed" />
            </div>
            <div className="absolute left-[10px] md:left-[0px]" style={{ top: "560px" }}>
              <TrackCard icon={PenTool} title="Power up & Asset" keywords="Reading · Critical Thinking · Expression" desc="고급 독해·에세이·발표" color="#F3FAF0" />
            </div>

            <div className="absolute right-[10px] md:right-[0px]" style={{ top: "180px" }}>
              <TrackCard icon={Type} title="Root / Beginner" keywords="Phonics · Listening · Speaking" desc="영어 기초 구조 형성" color="#E3F2E1" />
            </div>
            <div className="absolute right-[10px] md:right-[0px]" style={{ top: "380px" }}>
              <TrackCard icon={BookOpen} title="Ground up" keywords="Grammar · Writing · Structure" desc="문장·단락·논리 구축" color="#EAF6E5" />
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 text-center" style={{ top: "740px" }}>
              <div className="rounded-2xl px-5 py-4 shadow-sm" style={{ backgroundColor: colors.card }}>
                <div className="text-sm font-bold" style={{ color: colors.sub }}>
                  Different Paths,
                </div>
                <div className="text-sm font-bold" style={{ color: colors.sub }}>
                  One Advanced Academic Stage.
                </div>
              </div>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-xl" style={{ top: "980px" }}>
              <PradisCard />
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="font-bold" style={{ color: colors.text }}>
            아이마다 시작점도, 속도도 다릅니다. 프라게 에듀는 그 차이를 설계합니다.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/signup" className="px-5 py-3 rounded-xl font-bold border" style={{ borderColor: colors.olive, color: colors.text, backgroundColor: colors.card }}>
              레벨 테스트 안내
            </a>
            <a href="/admissions" className="px-5 py-3 rounded-xl font-bold" style={{ backgroundColor: colors.text, color: "#FFFBEA" }}>
              1:1 학습 상담 신청
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function TrackCard({ icon: Icon, title, keywords, desc, color }: { icon: any; title: string; keywords: string; desc: string; color: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-14 h-14 rounded-full shadow-sm flex items-center justify-center" style={{ backgroundColor: color }}>
        <Icon className="w-7 h-7" style={{ color: "#2F3E1D" }} />
      </div>
      <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: "#FFFDF6" }}>
        <div className="text-sm font-bold" style={{ color: "#2F3E1D" }}>{title}</div>
        <div className="text-xs mt-1 font-medium" style={{ color: "#5F6B4C" }}>{keywords}</div>
        <div className="text-sm mt-2" style={{ color: "#6E745C" }}>{desc}</div>
      </div>
    </div>
  );
}

function Badge({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full shadow-sm" style={{ backgroundColor: "#FDF7E9" }}>
      <BadgeCheck className="w-4 h-4" style={{ color: "#A3812B" }} />
      <span className="text-xs font-bold" style={{ color: "#2F3E1D" }}>{label}</span>
      <span className="text-xs" style={{ color: "#6E745C" }}>• {sub}</span>
    </div>
  );
}

function PradisCard() {
  return (
    <div className="rounded-3xl p-6 md:p-8 shadow-lg">
      <div className="rounded-2xl p-6" style={{ backgroundColor: "#0E2340" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#132B4F" }}>
            <GraduationCap className="w-7 h-7" style={{ color: "#D7B76E" }} />
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: "#F7E7C3" }}>PRADIS</div>
            <div className="text-sm" style={{ color: "#C9D5B3" }}>Academic & Global English Hub</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl p-4" style={{ backgroundColor: "#132B4F" }}>
            <div className="text-sm font-bold" style={{ color: "#F7E7C3" }}>Pradis Core (국내 학업 영어)</div>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: "#DDE6F2" }}>
              <li>중3–고1 수준 영어</li>
              <li>논·서술형 평가 대비</li>
              <li>사고력 독해 · 고급 작문</li>
            </ul>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "#132B4F" }}>
            <div className="text-sm font-bold" style={{ color: "#F7E7C3" }}>Pradis Global Track</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5" style={{ color: "#D7B76E" }} />
              </div>
              <div className="text-xs font-bold" style={{ color: "#F7E7C3" }}>International School Preparation</div>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center">
                <GraduationCap className="w-5 h-5" style={{ color: "#D7B76E" }} />
              </div>
              <div className="text-xs font-bold" style={{ color: "#F7E7C3" }}>Overseas University Pathway</div>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5" style={{ color: "#D7B76E" }} />
              </div>
              <div className="text-xs font-bold" style={{ color: "#F7E7C3" }}>Study Abroad Readiness</div>
            </div>
            <ul className="mt-3 space-y-1 text-sm" style={{ color: "#DDE6F2" }}>
              <li>국제학교 커리큘럼 대응</li>
              <li>해외대학 진학 Academic English</li>
              <li>에세이 · 인터뷰 · 발표 역량 강화</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
