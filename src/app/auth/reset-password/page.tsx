"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      setDone(true);
    } else {
      setError(error.message);
    }
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md w-full px-6 py-10 text-center">
          <h2 className="text-2xl font-bold text-frage-navy">비밀번호가 성공적으로 변경되었습니다.</h2>
          <a href="/portal" className="mt-6 inline-block px-6 py-3 rounded-xl bg-frage-navy text-white font-bold">포털로 이동</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full px-6 py-10">
        <h2 className="text-2xl font-bold text-frage-navy mb-4">비밀번호 재설정</h2>
        <input
          type="password"
          placeholder="새 비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 mb-3"
        />
        {error && <div className="text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-3 mb-3">{error}</div>}
        <button onClick={handleReset} className="w-full px-4 py-3 rounded-xl bg-frage-navy text-white font-bold">변경하기</button>
      </div>
    </main>
  );
}
