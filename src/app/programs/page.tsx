import React from "react";
 

export default function ProgramsPage() {
  const colors = {
    bg: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E5E5E5",
    text: "#111111",
    sub: "#666666",
  };

  return (
    <main className="min-h-screen pb-24" style={{ backgroundColor: colors.bg }}>
      <section className="pt-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="mt-2 text-3xl md:text-4xl font-bold" style={{ color: colors.text }}>
            커리큘럼
          </h1>
          <div className="mt-6 rounded-2xl mx-auto max-w-xl p-5" style={{ backgroundColor: colors.card }}>
            <div className="text-sm font-bold uppercase tracking-wider" style={{ color: colors.sub }}>
              Where the Journey Begins
            </div>
            <p className="mt-2 text-sm" style={{ color: colors.sub }}>
              단계별로 체계화된 프라게만의 커리큘럼을 소개합니다. 언어 습득의 원리를 기반으로 설계되었습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto mt-16 px-6">
        <div className="md:grid md:grid-cols-2 md:gap-12">
          <div className="space-y-8">
            <Stage title="Little FRAGE (3세–5세)" keywords="PLAY · EXPOSURE · CONFIDENCE" desc="놀이 기반 영어 노출과 친숙도 형성" />
            <Arrow />
            <Stage title="FRAGE Kinder (5세–7세)" keywords="PHONICS READY · SENTENCE · THINKING" desc="놀이에서 학습으로의 전환, 문장과 사고력의 초석" />
            <Arrow />
            <Stage title="Power up & Asset" keywords="READING · CRITICAL THINKING · EXPRESSION" desc="고급 독해 · 에세이 · 발표로 표현 역량 확장" />
          </div>
          <div className="space-y-8 mt-12 md:mt-0">
            <Stage title="Root / Beginner" keywords="PHONICS · LISTENING · SPEAKING" desc="영어 기초 구조 형성, 소리·말의 기반" />
            <Arrow />
            <Stage title="Ground up" keywords="GRAMMAR · WRITING · STRUCTURE" desc="문장·단락·논리 구축으로 학업형 영어의 토대" />
          </div>
        </div>

        

        <div className="text-center mt-14 space-y-3">
          <p className="font-bold" style={{ color: colors.text }}>
            아이마다 시작점도, 속도도 다릅니다. 프라게 에듀는 그 차이를 설계합니다.
          </p>
          <div className="flex items-center justify-center gap-6">
            <a href="/signup" className="text-sm font-bold underline underline-offset-4" style={{ color: colors.text }}>
              레벨 테스트 안내
            </a>
            <a href="/admissions" className="text-sm font-bold underline underline-offset-4" style={{ color: colors.text }}>
              1:1 학습 상담 신청
            </a>
          </div>
        </div>
      </section>
      <section className="max-w-3xl mx-auto mt-24 px-6 pt-10" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="text-center space-y-3">
          <div className="text-sm font-bold" style={{ color: colors.text }}>Fradis</div>
          <div className="space-y-1">
            <div className="text-sm" style={{ color: colors.sub }}>Academic & Global English Hub</div>
            <div className="text-sm" style={{ color: colors.sub }}>중3–고1 수준 영어</div>
            <div className="text-sm" style={{ color: colors.sub }}>논·서술형 평가 대비</div>
            <div className="text-sm" style={{ color: colors.sub }}>사고력 독해 · 고급 작문</div>
            <div className="text-sm" style={{ color: colors.sub }}>해외 유학/ 국제학교 준비</div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stage({ title, keywords, desc }: { title: string; keywords: string; desc: string }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-bold" style={{ color: "#111111" }}>{title}</div>
      <div className="text-[11px] font-bold tracking-widest" style={{ color: "#666666" }}>{keywords}</div>
      <div className="text-sm" style={{ color: "#666666" }}>{desc}</div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-px h-6" style={{ backgroundColor: "#E5E5E5" }} />
      <div className="text-xs font-bold" style={{ color: "#999999" }}>↓</div>
      <div className="w-px h-6" style={{ backgroundColor: "#E5E5E5" }} />
    </div>
  );
}
