"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Globe, LogIn } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, language, toggleLanguage } = useLanguage();

  // Detect scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: t.nav.programs, href: "/programs" },
    { name: t.nav.campuses, href: "/campuses" },
    { name: t.nav.admissions, href: "/admissions" },
    { name: t.nav.calendar, href: "/calendar" },
    { name: t.nav.news, href: "/news" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled || mobileMenuOpen
          ? "bg-white/95 backdrop-blur-md shadow-sm py-4 border-b border-gray-100"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-6 max-w-[1400px]">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" prefetch={false} className="flex items-center gap-3 group">
            <div className={`h-12 w-auto transition-all ${isScrolled ? "opacity-100" : "opacity-90"}`}>
               <img 
                 src="/logo.png" 
                 alt="FRAGE EDU Logo" 
                 className={`h-full w-auto object-contain ${!isScrolled && "brightness-0 invert"}`}
               />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-12">
            <Link
              href="/about"
              prefetch={false}
              className={`text-sm font-medium tracking-[0.15em] uppercase transition-all duration-300 hover:text-frage-gold ${
                isScrolled ? "text-frage-navy" : "text-white/90 hover:text-white"
              }`}
            >
              {t.nav.about}
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={`text-sm font-medium tracking-[0.15em] uppercase transition-all duration-300 hover:text-frage-gold ${
                  isScrolled ? "text-frage-navy" : "text-white/90 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={toggleLanguage}
              className={`flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-colors ${
                isScrolled ? "text-frage-navy hover:text-frage-gold" : "text-white/80 hover:text-white"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{language === "en" ? "KR" : "EN"}</span>
            </button>
            
            <Link
              href="/portal"
              prefetch={false}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-colors ${
                isScrolled ? "text-frage-gray hover:text-frage-navy bg-transparent" : "text-white/80 hover:text-white bg-transparent"
              } min-h-[48px]`}
            >
              <LogIn className="w-4 h-4" />
              {t.nav.portal}
            </Link>
            <a
              href="http://pf.kakao.com/_QGQvxj/chat"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs font-bold tracking-widest uppercase transition-colors ${
                isScrolled ? "text-frage-gray hover:text-frage-navy" : "text-white/80 hover:text-white"
              }`}
            >
              {t.nav.inquire}
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden p-2 transition-colors ${isScrolled ? "text-frage-navy" : "text-white"}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-lg p-4 flex flex-col gap-4 animate-in slide-in-from-top-2">
              <Link
                href="/portal"
                prefetch={false}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-frage-navy text-white min-h-[48px]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn className="w-5 h-5" />
                <span className="text-sm font-bold tracking-wider">{t.nav.portal}</span>
              </Link>
              <Link
                href="/about"
                prefetch={false}
                className="text-lg font-medium text-slate-700 py-2 border-b border-slate-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                학원 소개
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className="text-lg font-medium text-slate-700 py-2 border-b border-slate-50 last:border-0"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-2 pt-4">
                 <span className="text-sm font-bold text-slate-500">Language</span>
                 <button
                  onClick={toggleLanguage}
                  className="flex items-center gap-2 text-sm font-bold text-frage-navy px-4 py-2 bg-slate-100 rounded-full"
                >
                  <Globe className="w-4 h-4" />
                  <span>{language === "en" ? "한국어" : "English"}</span>
                </button>
              </div>
            </div>
          )}
        </header>
      );
    }
