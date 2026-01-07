"use client";

import Link from "next/link";

type TabKey = "philosophy" | "mission" | "growth" | "outcomes";

export default function AboutTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const tabs: { key: TabKey; label: string; href?: string }[] = [
    { key: "philosophy", label: "교육 철학" },
    { key: "mission", label: "교육 미션" },
    { key: "growth", label: "성장 설계" },
    { key: "outcomes", label: "성과" },
  ];
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="flex gap-6 overflow-x-auto no-scrollbar py-3">
          {tabs.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onChange(t.key)}
                className={`text-sm font-semibold pb-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-frage-navy border-b-2 border-frage-gold"
                    : "text-slate-400 hover:text-frage-navy"
                }`}
              >
                {t.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/outcomes"
              className="text-xs text-slate-400 hover:text-frage-navy"
            >
              성과 전체 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
