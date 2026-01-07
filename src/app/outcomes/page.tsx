export const revalidate = 3600;

import Link from "next/link";

type Highlight = {
  title: string;
  link: string;
  image?: string;
};

type ArchiveItem = {
  title: string;
  link: string;
  image?: string;
};

async function getOgImage(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "force-cache",
    });
    const html = await res.text();
    const match = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function getRssArchive() {
  const url = "https://rss.blog.naver.com/frage_2030.xml";
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    const xml = await res.text();
    const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).map(
      (m) => m[1]
    );
    const parsed = items
      .map((it) => {
        const title =
          it.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
          it.match(/<title>([\s\S]*?)<\/title>/)?.[1] ||
          "";
        const link =
          it.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || "";
        const category =
          it.match(/<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/)?.[1] ||
          it.match(/<category>([\s\S]*?)<\/category>/)?.[1] ||
          "";
        return { title, link, category };
      })
      .filter(
        (x) =>
          x.title.includes("성과") ||
          x.category.includes("성과")
      )
      .slice(0, 8);
    const withImages: ArchiveItem[] = await Promise.all(
      parsed.map(async (p) => {
        const image = await getOgImage(p.link);
        return {
          title: p.title,
          link: p.link,
          image:
            image ||
            "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1200&auto=format&fit=crop",
        };
      })
    );
    return withImages;
  } catch {
    return [];
  }
}

export default async function OutcomesPage() {
  const highlightLinks: Highlight[] = [
    {
      title: "유치부 Lexile 865 전국 최연소 · 최고점 기록",
      link: "https://blog.naver.com/frage_2030",
    },
    {
      title: "국제통번역자원봉사단 청소년 에세이 공모전 참가 학생 전원 수상",
      link: "https://blog.naver.com/frage_2030/223161007823",
    },
    {
      title: "전국 영어 말하기 대회 누적 750명 이상 출전",
      link: "https://blog.naver.com/frage_2030/222490002924",
    },
    {
      title: "숭실대학교 영어 말하기·영어 노래 대회 참가 학생 전원 수상",
      link: "https://blog.naver.com/frage_2030/223714898433",
    },
    {
      title: "Korea International School Jeju 합격",
      link: "https://blog.naver.com/frage_2030/223097800362",
    },
    {
      title: "동화책 번역 프로젝트 라오스 교류재단 이사장 표창",
      link: "https://blog.naver.com/frage_2030/223015427424",
    },
  ];

  const highlightsWithImages: Highlight[] = await Promise.all(
    highlightLinks.map(async (h) => {
      const image =
        (await getOgImage(h.link)) ||
        "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1200&auto=format&fit=crop";
      return { ...h, image };
    })
  );

  const archive = await getRssArchive();

  return (
    <div className="min-h-screen bg-frage-cream">
      <section className="relative bg-frage-navy text-white py-28">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <span className="text-frage-gold font-bold tracking-widest uppercase text-xs">
            성과 증명 페이지
          </span>
          <h1 className="font-serif text-4xl md:text-6xl mt-6 font-medium">
            프라게의 교육은 결과로 증명됩니다
          </h1>
          <p className="text-white/80 text-lg mt-6">
            국제 공인 지표 · 실제 학생 데이터 · 장기 성장 기록
          </p>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-frage-blue font-bold tracking-widest uppercase text-xs">
                Highlights
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-frage-navy font-bold mt-3">
                프라게 교육 시스템이 만들어낸 검증된 결과
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {highlightsWithImages.map((h, i) => (
              <a
                key={i}
                href={h.link}
                target="_blank"
                rel="noreferrer"
                className="group rounded-3xl border border-gray-100 overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={h.image || ""}
                    alt={h.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-frage-navy text-lg leading-tight">
                    {h.title}
                  </h3>
                  <p className="text-sm text-frage-gray mt-2">
                    블로그 원문 새 탭 오픈
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-frage-cream py-20">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <h2 className="font-serif text-3xl md:text-4xl text-frage-navy font-bold mb-10">
            진학 성과
          </h2>
          <p className="text-frage-gray text-lg mb-12">
            프라게 교육의 결과는 국내·국제학교 및 해외 대학 진학으로 이어집니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="font-serif text-2xl text-frage-navy font-bold mb-6">
                국내·국제학교
              </h3>
              <div className="space-y-4">
                <a
                  href="https://blog.naver.com/frage_2030/223017626733"
                  target="_blank"
                  rel="noreferrer"
                  className="block p-4 bg-white rounded-xl border border-gray-100 hover:border-frage-blue/30 transition-colors"
                >
                  2023 | Daegu International School 프라게 초등 국제반 합격
                </a>
                <a
                  href="https://blog.naver.com/frage_2030/222844192256"
                  target="_blank"
                  rel="noreferrer"
                  className="block p-4 bg-white rounded-xl border border-gray-100 hover:border-frage-blue/30 transition-colors"
                >
                  2022 | Branksome Hall Asia (제주 국제학교) 합격
                </a>
                <a
                  href="https://blog.naver.com/frage_2030/223743723260"
                  target="_blank"
                  rel="noreferrer"
                  className="block p-4 bg-white rounded-xl border border-gray-100 hover:border-frage-blue/30 transition-colors"
                >
                  2025 | 대구국제고등학교 최종 합격
                </a>
                <a
                  href="https://blog.naver.com/frage_2030/222611176482"
                  target="_blank"
                  rel="noreferrer"
                  className="block p-4 bg-white rounded-xl border border-gray-100 hover:border-frage-blue/30 transition-colors"
                >
                  2022 | 거창국제학교 중등과정 합격
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-serif text-2xl text-frage-navy font-bold mb-6">
                해외 대학
              </h3>
              <div className="space-y-4">
                <a
                  href="https://blog.naver.com/frage_2030/224078411287"
                  target="_blank"
                  rel="noreferrer"
                  className="block p-4 bg-white rounded-xl border border-gray-100 hover:border-frage-blue/30 transition-colors"
                >
                  2024 | Purdue University 합격
                </a>
                <div className="p-4 bg-white rounded-xl border border-gray-100">
                  2025 | Columbia University 합격
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100">
                  2020 | University of Michigan 합격
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <h2 className="font-serif text-3xl md:text-4xl text-frage-navy font-bold mb-10">
            수상·대회 성과
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-gray-100 bg-frage-cream">
              전국 영어 말하기 대회 누적 750명+ 출전
            </div>
            <div className="p-6 rounded-2xl border border-gray-100 bg-frage-cream">
              숭실대 영어 말하기·영어 노래 대회 전원 수상
            </div>
            <div className="p-6 rounded-2xl border border-gray-100 bg-frage-cream">
              국제통번역자원봉사단 청소년 에세이 공모전 전원 수상
            </div>
            <a
              href="https://blog.naver.com/frage_2030/222042337775"
              target="_blank"
              rel="noreferrer"
              className="p-6 rounded-2xl border border-gray-100 bg-white hover:border-frage-blue/30 transition-colors"
            >
              2020 | 제2회 코드페어 알고리즘 히어로즈 전원 합격
            </a>
          </div>
        </div>
      </section>

      <section className="bg-frage-cream py-20">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-frage-blue font-bold tracking-widest uppercase text-xs">
                성과 아카이브 | 실제 기록 보기
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-frage-navy font-bold mt-3">
                네이버 블로그 성과 글
              </h2>
            </div>
          </div>
          {archive.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center">
              <p className="text-sm font-bold text-frage-gray">
                최신 성과 아카이브를 불러오는 중입니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {archive.map((a, i) => (
                <a
                  key={i}
                  href={a.link}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-3xl border border-gray-100 overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="h-40 overflow-hidden">
                    <img
                      src={a.image || ""}
                      alt={a.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-frage-navy text-lg leading-tight line-clamp-2">
                      {a.title}
                    </h3>
                    <p className="text-sm text-frage-gray mt-2">
                      블로그 새 탭 이동 · 최신순
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container mx-auto px-6 max-w-[900px] text-center">
          <p className="text-frage-navy text-2xl md:text-3xl font-serif leading-relaxed">
            프라게의 성과는 일부 아이의 재능이 아니라 설계된 언어 환경의 결과입니다.
          </p>
        </div>
      </section>

      <section className="bg-frage-navy py-24 text-white">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/portal/admission"
              className="block text-center p-6 rounded-2xl bg-white text-frage-navy font-bold hover:bg-frage-gold hover:text-frage-navy transition-colors"
            >
              우리 아이 Lexile 진단 받아보기
            </Link>
            <Link
              href="/programs"
              className="block text-center p-6 rounded-2xl bg-white text-frage-navy font-bold hover:bg-frage-gold hover:text-frage-navy transition-colors"
            >
              프라게 유치부·초등 성장 로드맵 보기
            </Link>
            <a
              href="http://pf.kakao.com/_QGQvxj/chat"
              target="_blank"
              rel="noreferrer"
              className="block text-center p-6 rounded-2xl bg-white text-frage-navy font-bold hover:bg-frage-gold hover:text-frage-navy transition-colors"
            >
              상담 예약하기
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
