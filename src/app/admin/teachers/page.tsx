"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings, UserPlus, Users, Lock, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

type Teacher = {
  id: string;
  name: string;
  email: string;
  campus: "International" | "Andover" | "Platz" | "Atheneum";
  role: "teacher" | "campus";
  active: boolean;
  createdAt: string;
};

export default function AdminTeachersPage() {
  const [items, setItems] = useState<Teacher[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campus, setCampus] = useState<Teacher["campus"]>("International");
  const [role, setRole] = useState<Teacher["role"]>("teacher");
  const [query, setQuery] = useState("");
  const [campusFilter, setCampusFilter] = useState<"All" | Teacher["campus"]>("All");
  const [toast, setToast] = useState<string>("");
  const [policy, setPolicy] = useState<string>("Frage@2024");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("teacher_accounts");
      const list: Teacher[] = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    }
    try {
      const p = localStorage.getItem("teacher_initial_password_policy");
      if (p) setPolicy(p);
      else localStorage.setItem("teacher_initial_password_policy", policy);
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    return items
      .filter((t) => (campusFilter === "All" ? true : t.campus === campusFilter))
      .filter((t) => (query.trim() === "" ? true : t.name.includes(query) || t.email.includes(query)));
  }, [items, campusFilter, query]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setCampus("International");
    setRole("teacher");
  };

  const saveAll = (next: Teacher[]) => {
    setItems(next);
    localStorage.setItem("teacher_accounts", JSON.stringify(next));
  };

  const resetAll = () => {
    try {
      localStorage.removeItem("teacher_accounts");
      localStorage.removeItem("admin_teacher_class_map");
      setItems([]);
      setToast("전체 계정을 삭제하고 반 지정 정보를 초기화했습니다");
      setTimeout(() => setToast(""), 2500);
    } catch {}
  };

  const createTeacher = () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    const id = `t_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const item: Teacher = { id, name: name.trim(), email: email.trim(), campus, role, active: true, createdAt };
    const next = [item, ...items];
    saveAll(next);
    setToast("계정을 생성했습니다");
    resetForm();
    setTimeout(() => setToast(""), 2000);
  };

  const toggleActive = (id: string) => {
    const next = items.map((t) => (t.id === id ? { ...t, active: !t.active } : t));
    saveAll(next);
  };

  const resetPassword = (id: string) => {
    setToast("비밀번호를 초기화했습니다");
    setTimeout(() => setToast(""), 2000);
  };

  const removeTeacher = (id: string) => {
    const next = items.filter((t) => t.id !== id);
    saveAll(next);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-frage-yellow" />
            <h1 className="text-2xl font-black text-slate-900">선생님 계정 관리</h1>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-frage-navy text-white text-xs font-bold">
              초기 비밀번호 정책: {policy}
            </div>
            <button
              onClick={resetAll}
              className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold bg-red-50 text-red-700"
              title="전체 초기화"
            >
              전체 초기화
            </button>
            <span className="text-sm font-bold text-slate-700">캠퍼스</span>
            {["All", "International", "Andover", "Platz", "Atheneum"].map((c) => (
              <button
                key={c}
                onClick={() => setCampusFilter(c as any)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-bold whitespace-nowrap ${
                  campusFilter === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                {c === "All" ? "전체" : c === "International" ? "국제관" : c === "Andover" ? "앤도버" : c === "Platz" ? "플라츠" : "아테네움관"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-bold text-slate-700">새 계정 생성</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="아이디(이메일)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="초기 비밀번호"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <div className="flex items-center gap-2">
                <select
                  value={campus}
                  onChange={(e) => setCampus(e.target.value as Teacher["campus"])}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
                >
                  <option value="International">국제관</option>
                  <option value="Andover">앤도버</option>
                  <option value="Platz">플라츠</option>
                  <option value="Atheneum">아테네움관</option>
                </select>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Teacher["role"])}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
                >
                  <option value="teacher">교사</option>
                  <option value="campus">캠퍼스 관리자</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={resetForm} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">초기화</button>
                <button onClick={createTeacher} className="px-3 py-2 rounded-lg bg-frage-navy text-white text-sm font-bold">생성</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-bold text-slate-700">계정 목록</span>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색(이름/이메일)"
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              />
            </div>
            <div className="p-4 space-y-2">
              {filtered.length === 0 && <div className="text-xs text-slate-500">계정이 없습니다</div>}
              {filtered.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{t.name} <span className="text-xs font-medium text-slate-500">({t.role === "teacher" ? "교사" : "캠퍼스 관리자"})</span></div>
                    <div className="text-xs text-slate-600">{t.email} • {t.campus === "International" ? "국제관" : t.campus === "Andover" ? "앤도버" : t.campus === "Platz" ? "플라츠" : "아테네움관"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(t.id)}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold ${t.active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-700 bg-white"}`}
                      title={t.active ? "비활성화" : "활성화"}
                    >
                      {t.active ? <ToggleRight className="w-4 h-4 inline mr-1" /> : <ToggleLeft className="w-4 h-4 inline mr-1" />} {t.active ? "활성" : "비활성"}
                    </button>
                    <button
                      onClick={() => resetPassword(t.id)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold bg-white"
                      title="비밀번호 초기화"
                    >
                      <Lock className="w-4 h-4 inline mr-1" /> 비번 초기화
                    </button>
                    <button
                      onClick={() => removeTeacher(t.id)}
                      className="px-3 py-2 rounded-lg border border-red-200 text-xs font-bold bg-red-50 text-red-700"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" /> 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl border border-slate-200 shadow-lg px-4 py-3 text-sm font-bold text-slate-700">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
