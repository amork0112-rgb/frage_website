"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import AboutTabs from "./AboutTabs";
import SectionPhilosophy from "./SectionPhilosophy";
import SectionMission from "./SectionMission";
import SectionGrowth from "./SectionGrowth";
import SectionOutcomes from "./SectionOutcomes";

export default function AboutPage() {
  const { t } = useLanguage();
  const [active, setActive] = useState<"philosophy" | "mission" | "growth" | "outcomes">("philosophy");

  return (
    <main className="min-h-screen bg-frage-sand/30 pb-20">
      <section className="bg-frage-navy pt-24 pb-16 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">{t.about_page.hero_title}</h1>
          <p className="mt-4 text-frage-sand/80">{t.about_page.hero_subtitle}</p>
        </div>
      </section>

      <AboutTabs
        active={active}
        onChange={setActive}
      />
      {active === "philosophy" && <SectionPhilosophy />}
      {active === "mission" && <SectionMission />}
      {active === "growth" && <SectionGrowth />}
      {active === "outcomes" && <SectionOutcomes />}
    </main>
  );
}
