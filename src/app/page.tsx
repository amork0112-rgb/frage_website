"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import SectionOutcomes from "@/app/about/SectionOutcomes";

export default function HomePage() {
  const { t } = useLanguage();
  
  return (
    <div className="flex flex-col min-h-screen font-sans bg-frage-cream selection:bg-frage-gold selection:text-frage-navy">
      
      {/* 1. Hero Section: Fullscreen Friendly */}
      <section className="relative h-screen w-full overflow-hidden bg-frage-purple">
        {/* Background Image/Video Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src={"https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2000&auto=format&fit=crop"}
            alt="Students Studying Hard"
            fill
            className="object-cover transform scale-105 animate-slow-zoom opacity-30 mix-blend-overlay"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-frage-purple via-transparent to-transparent opacity-80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col justify-center h-full container mx-auto px-6 max-w-[1400px] pt-20 md:pt-0">
          <span className="text-frage-yellow font-bold tracking-widest uppercase mb-6 animate-fade-in inline-block bg-white/10 backdrop-blur-sm px-4 py-1 rounded-full w-fit">
            {t.hero.location}
          </span>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white font-medium leading-tight mb-8 max-w-5xl animate-fade-in-up delay-100 drop-shadow-lg">
            {t.hero.title_1}<br />
            <span className="text-frage-yellow font-bold">{t.hero.title_2}</span>
          </h1>
          <p className="text-white text-lg md:text-2xl font-medium tracking-wide max-w-3xl leading-relaxed mb-12 animate-fade-in-up delay-200 whitespace-pre-line drop-shadow-md">
            {t.hero.subtitle}
          </p>
          
          <div className="flex gap-6 animate-fade-in-up delay-300">
            <Link 
              href="/admissions" 
              className="group relative px-8 py-4 bg-frage-yellow text-frage-navy overflow-hidden transition-all hover:scale-105 rounded-full shadow-lg font-bold text-lg"
            >
              <span className="relative z-10">{t.hero.cta_admissions}</span>
            </Link>
            <Link 
              href="/about" 
              className="group px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-frage-blue transition-all rounded-full font-bold text-lg"
            >
              {t.hero.cta_discover}
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-slow z-20">
          <span className="text-white/80 text-xs tracking-widest uppercase font-bold">{t.hero.scroll}</span>
          <div className="w-[2px] h-8 bg-white rounded-full opacity-80"></div>
        </div>
      </section>

      {/* 1.5. Key Stats: Friendly & Trustworthy */}
      <section className="bg-white py-12 border-b border-gray-100 relative z-20 -mt-2 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {t.stats.items.map((stat, index) => (
              <div key={index} className="text-center group p-4 rounded-2xl hover:bg-frage-cream transition-colors duration-300">
                <span className="block text-3xl md:text-5xl font-serif text-frage-blue mb-2 font-bold">
                  {stat.value}
                </span>
                <span className="text-frage-gray text-sm font-bold tracking-wide">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Philosophy Section: Friendly Layout */}
      <section className="py-32 bg-frage-cream">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
            <div className="md:col-span-5 relative">
              <div className="relative z-10 overflow-hidden rounded-[2rem] shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
                <Image
                  src="/images/home-classroom.jpg"
                  alt="Students Studying in Classroom"
                  width={1200}
                  height={800}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute top-10 -left-10 w-full h-full border-4 border-frage-yellow rounded-[2rem] -z-0 -rotate-2"></div>
            </div>
            
            <div className="md:col-span-1"></div>

            <div className="md:col-span-6">
              <h2 className="font-serif text-3xl md:text-5xl text-frage-navy leading-tight mb-6 font-bold whitespace-pre-line">
                {t.philosophy.title}
              </h2>
              <p className="text-xl text-frage-gray font-medium leading-relaxed mb-10 whitespace-pre-line">
                {t.philosophy.subtitle}
              </p>
              
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-10">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  {t.philosophy.values.map((value, index) => (
                    <li key={index} className="flex items-center gap-3 text-frage-navy font-bold text-lg">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-frage-green text-white text-xs">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      {value}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pl-6 border-l-4 border-frage-blue">
                <p className="text-lg text-frage-navy font-medium leading-relaxed whitespace-pre-line">
                  {t.philosophy.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Outcomes: Use SectionOutcomes (Awards carousel + Admission outcomes) */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <SectionOutcomes showHighlights={false} />
        </div>
      </section>

      {/* 4. Programs: Minimal & Elegant */}
      <section className="py-32 bg-frage-navy text-white">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 border-b border-white/10 pb-10">
            <div>
              <span className="text-frage-gold font-bold tracking-[0.2em] uppercase text-xs">{t.programs.label}</span>
              <h2 className="font-serif text-4xl md:text-5xl mt-4">{t.programs.title}</h2>
            </div>
            <Link href="/programs" className="hidden md:flex items-center text-sm font-bold tracking-widest uppercase hover:text-frage-gold transition-colors mt-8 md:mt-0">
              {t.programs.view_all} <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.programs.items.map((program, index) => (
              <div key={index} className="group border-t border-white/20 pt-8 hover:border-frage-gold transition-colors duration-300">
                <span className="block text-frage-gold text-xs font-bold tracking-widest mb-4">{program.age}</span>
                <h3 className="font-serif text-2xl mb-4 group-hover:text-frage-gold transition-colors">{program.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-8 h-20">
                  {program.desc}
                </p>
                <Link href="/programs" className="inline-block border-b border-transparent group-hover:border-frage-gold pb-1 text-xs tracking-widest uppercase">
                  {t.programs.explore}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Final CTA: Minimalist (Renumbered from 5) */}
      <section className="relative py-40 bg-frage-cream flex items-center justify-center text-center overflow-hidden">
         {/* Background Decor */}
         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-frage-gold/5 rounded-full blur-3xl pointer-events-none"></div>

         <div className="relative z-10 max-w-3xl px-6">
           <h2 className="font-serif text-5xl md:text-6xl text-frage-navy mb-8 font-medium">
             {t.cta.title_1} <span className="italic text-frage-gold">{t.cta.title_2}</span>
           </h2>
           <p className="text-lg text-frage-gray mb-12 font-medium">
             {t.cta.desc}
           </p>
           <Link 
             href="/admissions" 
             className="inline-block px-12 py-5 bg-frage-navy text-white font-bold tracking-[0.2em] uppercase text-xs hover:bg-frage-gold transition-colors duration-500 shadow-xl"
           >
             {t.cta.button}
           </Link>
         </div>
      </section>

    </div>
  );
}
