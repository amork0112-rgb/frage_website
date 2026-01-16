"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

type Step = "phone" | "otp" | "confirm" | "account";

type ChildInfo = {
  id: string;
  name: string;
  englishName: string;
  className: string;
  campus: string;
  status: string;
};

export default function ParentFirstVerificationPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(180);
  const [timerActive, setTimerActive] = useState(false);

  const [parentId, setParentId] = useState<string | null>(null);
  const [parentName, setParentName] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildInfo[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [hasAuthUser, setHasAuthUser] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setHasAuthUser(!!data?.user);
      } catch {
        setHasAuthUser(false);
      }
    })();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (step === "otp" && timerActive) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timerActive]);

  const formatTimer = () => {
    const m = Math.floor(timer / 60);
    const s = timer % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleRequestOtp = () => {
    const raw = phone.replace(/\D/g, "");
    if (!raw) {
      setError("휴대폰 번호를 입력해 주세요.");
      return;
    }
    if (raw.length < 10 || raw.length > 11) {
      setError("휴대폰 번호 형식을 확인해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "request",
            phone,
          }),
        });
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (!res.ok) {
          const code = data?.error;
          if (res.status === 404 && code === "no_registered_student") {
            setError("등록된 재원생 정보가 없습니다. 상담실로 문의해 주세요.");
          } else if (res.status === 409 && code === "already_has_account") {
            setError(
              "이미 포털 계정이 있습니다. 로그인 화면에서 이메일과 비밀번호로 로그인해 주세요."
            );
          } else if (res.status === 400 && code === "phone_required") {
            setError("휴대폰 번호를 입력해 주세요.");
          } else {
            setError("인증 시스템 오류입니다. 잠시 후 다시 시도해 주세요.");
          }
          return;
        }

        if (data && data.ok === false) {
          const code = data?.error;
          if (code === "no_registered_student") {
            setError("등록된 재원생 정보가 없습니다. 상담실로 문의해 주세요.");
          } else if (code === "already_has_account") {
            setError(
              "이미 포털 계정이 있습니다. 로그인 화면에서 이메일과 비밀번호로 로그인해 주세요."
            );
          } else if (code === "phone_required") {
            setError("휴대폰 번호를 입력해 주세요.");
          } else {
            setError("인증 시스템 오류입니다. 잠시 후 다시 시도해 주세요.");
          }
          return;
        }

        setStep("otp");
        setTimer(180);
        setTimerActive(true);
        setOtp("");

        if (data.debugCode) {
          console.log("[DEBUG OTP CODE]", data.debugCode);
        }
      } catch {
        setError("인증번호 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleVerifyOtp = () => {
    // 1. 이미 완료된 단계이거나 로딩 중이면 차단 (중복 실행 방지)
    if (step !== "otp" || loading) return;

    if (!otp.trim() || otp.trim().length < 4) {
      setError("인증번호를 입력해 주세요.");
      return;
    }
    if (timer === 0 || !timerActive) {
      setError("인증번호가 만료되었습니다. 다시 요청해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "verify",
            phone,
            code: otp.trim(),
          }),
        });
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (!res.ok) {
          const code = data?.error;
          if (res.status === 400 && code === "invalid_otp") {
            setError("인증번호가 올바르지 않습니다.");
          } else if (res.status === 400 && code === "expired") {
            setError("인증번호가 만료되었습니다. 다시 요청해 주세요.");
            setTimerActive(false);
            setTimer(0);
          } else if (res.status === 404 && code === "no_registered_student") {
            setError("등록된 재원생 정보가 없습니다.");
          } else {
            setError("인증 시스템 오류입니다. 잠시 후 다시 시도해 주세요.");
          }
          return;
        }

        if (data && data.ok === false) {
          const code = data?.error;
          if (code === "invalid_otp") {
            setError("인증번호가 올바르지 않습니다.");
          } else if (code === "expired") {
            setError("인증번호가 만료되었습니다. 다시 요청해 주세요.");
            setTimerActive(false);
            setTimer(0);
          } else if (code === "no_registered_student") {
            setError("등록된 재원생 정보가 없습니다.");
          } else {
            setError("인증 시스템 오류입니다. 잠시 후 다시 시도해 주세요.");
          }
          return;
        }

        setTimerActive(false);

        const verifiedParentId = data.parentId ? String(data.parentId) : "";
        const verifiedParentName = data.parentName || null;
        const verifiedChildren = Array.isArray(data.children) ? data.children : [];

        if (hasAuthUser && verifiedParentId) {
          try {
            const res2 = await fetch("/api/otp", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                mode: "complete",
                parentId: verifiedParentId,
              }),
            });
            const payload2 = await res2.json().catch(() => ({}));
            if (!res2.ok || payload2.ok === false) {
              setError("계정 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
              return;
            }
          } catch {
            setError("계정 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
            return;
          }
          setParentId(verifiedParentId || null);
          setParentName(verifiedParentName);
          setChildren(verifiedChildren);
          router.replace("/portal/home");
          return;
        }

        setParentId(verifiedParentId || null);
        setParentName(verifiedParentName);
        setChildren(verifiedChildren);

        setStep("confirm");
      } catch {
        setError("인증번호 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleCreateAccount = () => {
    const emailTrim = email.trim();
    const pwTrim = password.trim();
    const pw2Trim = passwordConfirm.trim();

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim);
    if (!emailOk) {
      setError("이메일 형식이 올바르지 않습니다.");
      return;
    }

    const pwOk = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,30}$/.test(pwTrim);
    if (!pwOk) {
      setError("비밀번호는 영문+숫자 조합 6~30자여야 합니다.");
      return;
    }

    if (pwTrim !== pw2Trim) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    if (!parentId) {
      setError("인증 정보가 올바르지 않습니다. 처음부터 다시 진행해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: emailTrim,
          password: pwTrim,
        });

        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("already") && msg.includes("registered")) {
            setError("이미 가입된 이메일입니다. 로그인 화면에서 로그인해 주세요.");
          } else if (msg.includes("password")) {
            setError("비밀번호 정책 오류: 영문+숫자 6자 이상으로 설정해 주세요.");
          } else {
            setError("계정 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
          }
          return;
        }

        if (!data?.user) {
          setError("계정 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        const res = await fetch("/api/otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "complete",
            parentId,
          }),
        });
        const payload = await res.json();
        if (!res.ok || payload.ok === false) {
          setError("계정 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        router.replace("/auth/redirect");
      } catch {
        setError("계정 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-frage-cream">
      <Header />
      <main className="flex-grow pt-32 pb-20">
        <section className="container mx-auto px-6 max-w-xl">
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100">
            <h1 className="text-xl md:text-2xl font-black text-frage-navy mb-2">
              재원생 학부모 최초 인증
            </h1>
            <p className="text-sm text-frage-gray mb-6 leading-relaxed">
              FRAGE에 이미 재원 중인 자녀의 학부모님을 위한 1회성 인증입니다.
              인증 완료 후에는 이메일과 비밀번호로 일반 로그인을 이용해 주세요.
            </p>

            {step === "phone" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-frage-navy mb-1">
                    재원생 학부모 인증
                  </h2>
                  <p className="text-sm text-frage-gray">
                    FRAGE에 등록된 휴대폰 번호를 입력해 주세요. 처음 한 번만 진행되는
                    인증입니다.
                  </p>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="phone"
                    className="block text-sm font-bold text-frage-navy"
                  >
                    휴대폰 번호
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                  />
                  <p className="text-xs text-frage-gray mt-1">
                    ※ 등록되지 않은 번호는 인증할 수 없습니다.
                  </p>
                </div>
                {error && (
                  <div className="text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-frage-navy text-white font-bold text-sm hover:bg-frage-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "발송 중..." : "인증번호 받기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/portal")}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50"
                  >
                    로그인 화면으로
                  </button>
                </div>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-frage-navy mb-1">
                    인증번호 입력
                  </h2>
                  <p className="text-sm text-frage-gray">
                    입력하신 휴대폰 번호로 인증번호를 발송했습니다.
                  </p>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="otp"
                    className="block text-sm font-bold text-frage-navy"
                  >
                    인증번호 6자리
                  </label>
                  <input
                    id="otp"
                    type="tel"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="인증번호 입력"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy tracking-[0.4em] text-center"
                  />
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-frage-gray">
                      남은 시간:{" "}
                      <span className="font-bold text-frage-navy">
                        {formatTimer()}
                      </span>
                    </span>
                    <span className="text-slate-400">
                      3분 이내에 입력해 주세요.
                    </span>
                  </div>
                </div>
                {error && (
                  <div className="text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-frage-navy text-white font-bold text-sm hover:bg-frage-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "확인 중..." : "인증하기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setTimerActive(false);
                      setTimer(180);
                      setOtp("");
                      setError(null);
                    }}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50"
                  >
                    휴대폰 번호 다시 입력
                  </button>
                </div>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-frage-navy mb-1">
                    자녀 정보 확인
                  </h2>
                  <p className="text-sm text-frage-gray">
                    아래 자녀 정보가 맞는지 확인해 주세요.
                  </p>
                </div>
                <div className="space-y-3 bg-slate-50 rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">
                    학부모 성함:{" "}
                    <span className="font-bold text-slate-900">
                      {parentName || "학부모님"}
                    </span>
                  </div>
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="rounded-xl bg-white border border-slate-200 p-3"
                    >
                      <div className="text-sm font-bold text-slate-900">
                        {child.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        캠퍼스: {child.campus || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        반 이름: {child.className || "-"}
                      </div>
                    </div>
                  ))}
                </div>
                {error && (
                  <div className="text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep("account")}
                    className="flex-1 py-3 rounded-xl bg-frage-navy text-white font-bold text-sm hover:bg-frage-blue"
                  >
                    이 정보가 맞습니다
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setPhone("");
                      setOtp("");
                      setError(null);
                    }}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50"
                  >
                    정보가 다릅니다
                  </button>
                </div>
              </div>
            )}

            {step === "account" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-frage-navy mb-1">
                    계정 생성 및 비밀번호 설정
                  </h2>
                  <p className="text-sm text-frage-gray">
                    앞으로 포털에 로그인할 이메일과 비밀번호를 설정해 주세요.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-bold text-frage-navy mb-1"
                    >
                      이메일
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-bold text-frage-navy mb-1"
                    >
                      비밀번호
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="영문+숫자 조합 6자 이상"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="passwordConfirm"
                      className="block text-sm font-bold text-frage-navy mb-1"
                    >
                      비밀번호 확인
                    </label>
                    <input
                      id="passwordConfirm"
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="비밀번호를 다시 입력해 주세요."
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                    />
                  </div>
                </div>
                {error && (
                  <div className="text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleCreateAccount}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-frage-navy text-white font-bold text-sm hover:bg-frage-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "저장 중..." : "계정 생성 및 로그인"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("confirm")}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50"
                  >
                    자녀 정보 다시 확인
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
