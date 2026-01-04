"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwTimer, setPwTimer] = useState<NodeJS.Timeout | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        const userEmail = userData?.user?.email || "";
        if (!userId) {
          router.push("/login");
          return;
        }
      const { data: parentsRows } = await supabase
        .from("parents")
        .select("*")
        .eq("auth_user_id", userId)
        .limit(1);
      if (!Array.isArray(parentsRows) || parentsRows.length === 0) {
        const now = new Date().toISOString();
        await supabase
          .from("parents")
          .insert({
            auth_user_id: userId,
            name: "학부모",
            phone: "",
            created_at: now,
          });
      }
      try {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
        const masterAdminEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || "";
        const masterTeacherEmail = process.env.NEXT_PUBLIC_MASTER_TEACHER_EMAIL || "";
        if (userEmail && masterAdminEmail && userEmail.toLowerCase() === masterAdminEmail.toLowerCase()) {
          localStorage.setItem("portal_role", "master_admin");
        }
        if (userEmail && adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase()) {
          localStorage.setItem("admin_role", "admin");
        } else if (userEmail && masterTeacherEmail && userEmail.toLowerCase() === masterTeacherEmail.toLowerCase()) {
          localStorage.setItem("admin_role", "teacher");
          localStorage.setItem("current_teacher_id", "master_teacher");
        }
      } catch {}
      try {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@frage.kr";
        const masterAdminEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || "master_admin@frage.kr";
        const masterTeacherEmail = process.env.NEXT_PUBLIC_MASTER_TEACHER_EMAIL || "master_teacher@frage.kr";
        if (userEmail && adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase()) {
          router.push("/admin/home");
          return;
        }
        if (userEmail && masterAdminEmail && userEmail.toLowerCase() === masterAdminEmail.toLowerCase()) {
          router.push("/admin/home");
          return;
        }
        if (userEmail && masterTeacherEmail && userEmail.toLowerCase() === masterTeacherEmail.toLowerCase()) {
          router.push("/teacher/home");
          return;
        }
      } catch {}
      router.push("/portal/home");
    } catch {
      router.push("/portal/home");
    }
  }

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
    <section className="mx-auto max-w-md py-10">
      <h1 className="text-2xl font-semibold">로그인</h1>
      <p className="mt-2 text-slate-700">
        학부모님 전용 커뮤니티 접근을 위해 이메일과 비밀번호를 입력하세요.
      </p>
      <form onSubmit={onSubmit} autoComplete="off" className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2"
            placeholder="you@example.com"
            required
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">비밀번호</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded border px-3 py-2 pr-10 transition-colors ${showPw ? "bg-yellow-50 border-yellow-200" : ""}`}
              placeholder="••••••••"
              required
              autoComplete="off"
              aria-label="비밀번호 입력"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보이기"}
              aria-pressed={showPw}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {showPw && (
              <div className="absolute -bottom-6 right-0 text-[11px] font-bold text-amber-600">5초 후 자동 숨김</div>
            )}
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </section>
  );
}
