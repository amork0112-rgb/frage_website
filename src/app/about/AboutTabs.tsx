"use client";

import { useLanguage } from "@/context/LanguageContext";

type TabKey = "philosophy" | "mission" | "growth" | "outcomes";

export default function AboutTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const tabs: { key: TabKey; label: string; href?: string }[] = [
    { key: "philosophy", label: isEn ? "How We Teach" : "교육 철학" },
    { key: "mission", label: isEn ? "Why We Teach" : "교육 미션" },
    { key: "growth", label: isEn ? "How Children Grow" : "성장 설계" },
    { key: "outcomes", label: isEn ? "What Children Achieve" : "성과" },
  ];
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="relative py-3">
          <div className="flex justify-center gap-6 overflow-x-auto no-scrollbar">
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
          </div>
        </div>
      </div>
    </div>
  );
}
