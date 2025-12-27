"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  const footerLinks = {
    programs: [
      { name: "Little Frage", href: "/programs" },
      { name: "Kindergarten", href: "/programs" },
      { name: "Elementary", href: "/programs" },
      { name: "Secondary", href: "/programs" },
    ],
    campuses: [
      { name: "International Hall", href: "/campuses" },
      { name: "Andover Hall", href: "/campuses" },
      { name: "Atheneum Hall", href: "/campuses" },
      { name: "Platz Hall", href: "/campuses" },
    ],
  };

  return (
    <footer className="bg-frage-navy text-white pt-24 pb-12 border-t border-white/10">
      <div className="container mx-auto px-6 max-w-[1400px]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
          
          {/* Brand Manifesto */}
          <div className="md:col-span-4">
            <Link href="/" className="inline-block mb-8 group">
              <span className="font-serif text-3xl font-bold tracking-tighter">F.</span>
            </Link>
            <p className="text-white/70 leading-relaxed font-normal max-w-sm">
              {t.footer.manifesto}
            </p>
          </div>

          {/* Spacer */}
          <div className="hidden md:block md:col-span-2"></div>

          {/* Navigation Columns */}
          <div className="md:col-span-3">
            <h4 className="text-frage-gold text-xs font-bold tracking-widest uppercase mb-8">{t.footer.programs_title}</h4>
            <ul className="space-y-4">
              {footerLinks.programs.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-white/70 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-frage-gold text-xs font-bold tracking-widest uppercase mb-8">{t.footer.campuses_title}</h4>
            <ul className="space-y-4">
              {footerLinks.campuses.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-white/70 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-xs tracking-wide">
            {t.footer.copyright}
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-white/40 text-xs hover:text-white transition-colors">
              {t.footer.privacy}
            </Link>
            <Link href="/portal" className="text-white/40 text-xs hover:text-white transition-colors">
              {t.footer.admin}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
