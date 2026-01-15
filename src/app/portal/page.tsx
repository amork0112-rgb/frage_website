//app/portal/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Play, UserPlus, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export default function PortalPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwTimer, setPwTimer] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: id.trim(),
          password: password.trim(),
        });
        if (error) {
          const msg = error.message;
          if (msg === "Invalid login credentials") {
            setError("등록되지 않은 이메일이거나 비밀번호가 올바르지 않습니다.");
          } else {
            setError("로그인 중 문제가 발생했습니다.");
          }
          return;
        }
        if (data?.user) {
          router.replace("/auth/redirect");
        } else {
          setError("로그인 중 문제가 발생했습니다.");
        }
      } catch (e: any) {
        setError(e?.message || "로그인 중 문제가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleForgotPassword = async () => {
    try {
      const email = id.trim() || (typeof window !== "undefined" ? window.prompt("이메일을 입력해 주세요") || "" : "");
      if (!email) return;
      const redirect =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/reset-password`
          : "https://www.frage.co.kr/auth/reset-password";
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
      if (error) {
        setError(error.message);
        return;
      }
      setResetInfo("비밀번호 재설정 메일을 발송했습니다. 이메일을 확인해 주세요.");
    } catch {
      setError("재설정 요청 중 문제가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (showPw) {
      if (pwTimer) clearTimeout(pwTimer);
      const t = setTimeout(() => setShowPw(false), 5000);
      setPwTimer(t);
    } else {
      if (pwTimer) {
        clearTimeout(pwTimer);
        setPwTimer(null);
      }
    }
  }, [showPw]);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-frage-cream">
      <Header />
      
      <main className="flex-grow pt-32 pb-20">
        <section id="portal" className="py-12 bg-white rounded-3xl mx-6 shadow-sm">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24">
              
              {/* Left Column: Text & Context */}
              <div className="md:w-1/2">
                <span className="inline-block px-4 py-1 rounded-full bg-frage-cream text-frage-navy text-xs font-bold tracking-widest uppercase mb-6">
                  Student & Parent Access
                </span>
                <h2 className="font-serif text-4xl md:text-5xl text-frage-navy leading-tight mb-6">
                  {t.portal.title}
                </h2>
                <p className="text-xl text-frage-gray leading-relaxed mb-8">
                  {t.portal.subtitle}
                </p>
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-frage-cream/50 border border-frage-cream">
                    <div className="p-2 bg-white rounded-full text-frage-blue shadow-sm">
                       <Play className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h4 className="font-bold text-frage-navy mb-1">Video Library</h4>
                      <p className="text-sm text-frage-gray">Access reading materials and lesson reviews.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-frage-cream/50 border border-frage-cream">
                    <div className="p-2 bg-white rounded-full text-frage-green shadow-sm">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-frage-navy mb-1">Learning Reports</h4>
                      <p className="text-sm text-frage-gray">Track progress and monthly feedback.</p>
                    </div>
                  </div>
                </div>
              
              
              </div>

              {/* Right Column: Login Form */}
              <div className="md:w-1/2 w-full max-w-md bg-white p-8 md:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 relative">
                <form onSubmit={handleLogin} autoComplete="off" className="flex flex-col gap-5">
                  <div>
                    <h3 className="text-xl font-black text-frage-navy">
                      {language === "ko" ? "FRAGE 학습 포털 로그인" : "FRAGE Learning Portal Login"}
                    </h3>
                    <p className="mt-2 text-sm text-frage-gray leading-relaxed">
                      {language === "ko"
                        ? "신규 학부모 및 인증을 완료한 재원생 학부모는 이메일과 비밀번호로 로그인해 주세요."
                        : "New parents and verified existing parents, please log in with your email and password."}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="id" className="sr-only">Email</label>
                    <input 
                      type="email" 
                      id="id" 
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      placeholder="you@example.com" 
                      className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all font-medium text-frage-navy placeholder:text-gray-400"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="sr-only">Password</label>
                    <div className="relative">
                      <input 
                        type={showPw ? "text" : "password"} 
                        id="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.portal.login_placeholder_pw} 
                        className={`w-full px-6 py-4 pr-12 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all font-medium text-frage-navy placeholder:text-gray-400 ${showPw ? "bg-yellow-50 border-yellow-200" : ""}`}
                        autoComplete="off"
                        aria-label="비밀번호 입력"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보이기"}
                        aria-pressed={showPw}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      {showPw && (
                        <div className="absolute -bottom-6 right-0 text-[11px] font-bold text-amber-600">5초 후 자동 숨김</div>
                      )}
                    </div>
                  </div>
                  
                  {error && (
                    <div role="alert" aria-live="polite" className="text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3">
                      {error}
                    </div>
                  )}
                  {resetInfo && (
                    <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-3">
                      {resetInfo}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer text-frage-gray hover:text-frage-navy transition-colors">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-frage-blue focus:ring-frage-blue" />
                      {t.portal.auto_login}
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-frage-gray hover:text-frage-blue transition-colors font-medium"
                    >
                      {t.portal.forgot}
                    </button>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 mt-2 bg-frage-navy text-white rounded-xl font-bold text-lg hover:bg-frage-blue hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-frage-navy/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "..." : t.portal.login_btn}
                  </button>
                  
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <h4 className="text-sm font-bold text-frage-navy">
                      {language === "ko"
                        ? "재원생 학부모 최초 인증 (1회)"
                        : "First-Time Verification for Existing Parents (One-Time)"}
                    </h4>
                    <p className="mt-2 text-xs text-frage-gray leading-relaxed">
                      {language === "ko"
                        ? "FRAGE 재원생 학부모는 처음 한 번만 휴대폰 인증을 진행해 주세요. 인증 후에는 비밀번호로 로그인하실 수 있습니다."
                        : "If your child is already enrolled at FRAGE, please complete phone verification once. After that, you can log in with your password."}
                    </p>
                    <button
                      type="button"
                      className="w-full mt-3 py-3 rounded-xl border-2 border-frage-navy text-frage-navy font-bold text-sm bg-white hover:bg-frage-navy/5 active:bg-frage-navy/10 transition-all"
                    >
                      {language === "ko" ? "재원생 최초 인증 시작" : "Start First-Time Verification"}
                    </button>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-frage-gray text-sm mb-3">
                      {language === "ko" ? "계정이 없으신가요?" : t.portal.signup_desc}
                    </p>
                    <Link 
                      href="/signup"
                      prefetch={false}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-frage-blue text-frage-blue font-bold hover:bg-frage-blue hover:text-white transition-colors w-full"
                    >
                      <UserPlus className="w-5 h-5" />
                      {language === "ko" ? "회원가입 (신규 학부모)" : "Sign Up (New Parent)"}
                    </Link>
                  </div>
                </form>
                
                
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
