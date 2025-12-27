import React from "react";

export default function ProgramsPage() {
  const programs = [
    {
      title: "Early Phonics & Reading",
      target: "유치부 ~ 초등 저학년",
      description: "영어의 소리 값을 정확히 인지하고, 유창한 읽기(Fluency)로 나아가는 첫 단계입니다.",
      features: ["음소 인식(Phonemic Awareness)", "기초 파닉스 및 사이트 워드", "다독(Extensive Reading) 습관 형성"],
      color: "border-l-4 border-frage-accent"
    },
    {
      title: "Intensive Reading & Discussion",
      target: "초등 중학년 ~ 고학년",
      description: "다양한 장르의 텍스트를 읽고, 깊이 있는 질문을 통해 비판적 사고력을 키웁니다.",
      features: ["Fiction & Non-fiction 균형 독서", "Guided Reading & Comprehension", "주제 중심 토론 (Thematic Discussion)"],
      color: "border-l-4 border-frage-primary"
    },
    {
      title: "Academic Writing & Debate",
      target: "초등 고학년 ~ 중등",
      description: "논리적인 글쓰기와 설득력 있는 말하기를 통해 글로벌 리더로서의 자질을 갖춥니다.",
      features: ["Essay Writing (Persuasive, Expository)", "Formal Debate Structure", "시사 이슈 분석 및 발표"],
      color: "border-l-4 border-frage-navy"
    },
    {
      title: "IB Prep & Global Track",
      target: "국제학교/유학 준비생",
      description: "국제 표준 커리큘럼(IB) 스타일의 탐구 학습으로 학문적 영어 능력을 완성합니다.",
      features: ["Inquiry-based Learning", "Literature Analysis", "Research Paper Writing"],
      color: "border-l-4 border-frage-forest"
    }
  ];

  return (
    <main className="min-h-screen bg-white pb-20">
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-6 text-center">
          <span className="text-sm font-bold tracking-widest text-frage-accent uppercase">Curriculum</span>
          <h1 className="mt-2 text-3xl font-bold text-frage-navy md:text-4xl">Programs</h1>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            단계별로 체계화된 프라게만의 커리큘럼을 소개합니다.<br/>
            언어 습득의 원리를 기반으로 설계되었습니다.
          </p>
        </div>
      </section>

      <section className="container mx-auto mt-12 px-6">
        <div className="grid gap-8 md:grid-cols-2">
          {programs.map((program, index) => (
            <div key={index} className={`rounded-xl bg-white p-8 shadow-sm hover:shadow-md transition-shadow border border-slate-100 ${program.color}`}>
              <div className="mb-2 text-sm font-medium text-slate-500">{program.target}</div>
              <h3 className="mb-3 text-2xl font-bold text-slate-900">{program.title}</h3>
              <p className="mb-6 text-slate-600 leading-relaxed">{program.description}</p>
              <ul className="space-y-2">
                {program.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-slate-700">
                    <span className="mr-2 text-frage-accent">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
