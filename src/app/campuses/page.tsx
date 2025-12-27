import Link from "next/link";

export const metadata = {
  title: "관별 안내 | Frage English Academy",
  description: "국제관, 앤도버관, 아테네움관, 플라츠관 등 아이의 성향과 목표에 맞는 최적의 교육 공간을 안내합니다.",
};

export default function CampusesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <header className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-frage-primary">Campuses</h1>
        <p className="mt-4 text-lg text-slate-600">
          하나의 철학, 아이의 성향과 목표에 맞춘 네 개의 교육 공간.
        </p>
      </header>

      <div className="grid gap-12 sm:grid-cols-2">
        {/* 국제관 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-4 inline-block rounded bg-frage-primary/10 px-3 py-1 text-sm font-semibold text-frage-primary">
            국제관
          </div>
          <h2 className="text-2xl font-bold text-slate-900">International Campus</h2>
          <p className="mt-3 text-slate-600">
            IB 스타일 탐구 수업과 국제학교 트랙을 위한 심화 공간입니다. 고급 독해,
            비판적 에세이 라이팅, 심층 토론 수업이 진행됩니다.
          </p>
          <div className="mt-6 space-y-2 text-sm text-slate-500">
            <p>📍 대구 수성구 수성로54길 45</p>
            <p>🎓 대상: 초등 고학년 ~ 중등 (국제학교/유학 준비)</p>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <a
              href="http://pf.kakao.com/_QGQvxj"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-bold text-[#191919] hover:bg-[#FDD835] transition-colors"
            >
              국제관 카카오톡 상담하기
            </a>
            <a
              href="https://map.kakao.com/link/search/대구 수성구 수성로54길 45"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              지도 크게 보기
            </a>
          </div>
        </div>

        {/* 앤도버관 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-4 inline-block rounded bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            앤도버관
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Andover Campus</h2>
          <p className="mt-3 text-slate-600">
            국내 정규 트랙의 표준입니다. 파닉스부터 시작해 정확한 읽기 유창성을
            다지고, 사고력 독해와 논리적 글쓰기로 나아갑니다.
          </p>
          <div className="mt-6 space-y-2 text-sm text-slate-500">
            <p>📍 대구 수성구 달구벌대로 2482</p>
            <p>🎓 대상: 유치부 ~ 초등 전 학년</p>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <a
              href={process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL ?? "https://pf.kakao.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-lg bg-frage-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              상담 문의하기
            </a>
            <a
              href="https://map.kakao.com/link/search/대구 수성구 달구벌대로 2482"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              지도 크게 보기
            </a>
          </div>
        </div>

        {/* 아테네움관 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-4 inline-block rounded bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            아테네움관
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Atheneum Campus</h2>
          <p className="mt-3 text-slate-600">
            앤도버관과 동일한 커리큘럼과 평가 시스템으로 운영되는 지역 거점
            캠퍼스입니다. 가까운 곳에서 프라게의 교육을 만날 수 있습니다.
          </p>
          <div className="mt-6 space-y-2 text-sm text-slate-500">
            <p>📍 대구 수성구 범어천로 167 진영빌딩 3층</p>
            <p>🎓 대상: 유치부 ~ 초등 전 학년</p>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <a
              href={process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL ?? "https://pf.kakao.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-lg bg-frage-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              상담 문의하기
            </a>
          </div>
        </div>

        {/* 플라츠관 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-4 inline-block rounded bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            플라츠관
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Platz Campus</h2>
          <p className="mt-3 text-slate-600">
            영어 도서관 기반의 놀이학교입니다. 자연스러운 언어 노출과 즐거운
            원서 읽기를 통해 영어의 첫 단추를 행복하게 채웁니다.
          </p>
          <div className="mt-6 space-y-2 text-sm text-slate-500">
            <p>📍 대구 수성구 범어천로 175</p>
            <p>🎓 대상: 5세 ~ 7세 (유치부)</p>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <a
              href={process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL ?? "https://pf.kakao.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-lg bg-frage-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              상담 문의하기
            </a>
            <a
              href="https://map.kakao.com/link/search/대구 수성구 범어천로 175"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              지도 크게 보기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
