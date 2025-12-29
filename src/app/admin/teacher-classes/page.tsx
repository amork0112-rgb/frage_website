"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, Save, Search } from "lucide-react";

type Teacher = {
  id: string;
  name: string;
  email: string;
  campus: "International" | "Andover" | "Platz" | "Atheneum";
  role: "teacher" | "campus";
  active: boolean;
  createdAt: string;
};

type Student = {
  id: string;
  name: string;
  englishName: string;
  className: string;
  campus: string;
};

const seedNames = ["Yolandi", "Joni", "Jan L.J", "Diana", "Sophie", "Patrick", "Angus"];

export default function AdminTeacherClassesPage() {
  const [role, setRole] = useState<"admin" | "teacher" | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [campusFilter, setCampusFilter] = useState<"All" | Teacher["campus"]>("All");
  const [classCatalog, setClassCatalog] = useState<string[]>([]);

  useEffect(() => {
    try {
      const r = localStorage.getItem("admin_role");
      setRole(r === "teacher" ? "teacher" : "admin");
    } catch {
      setRole(null);
    }
    try {
      const raw = localStorage.getItem("teacher_accounts");
      const list: Teacher[] = raw ? JSON.parse(raw) : [];
      const byName = new Map(list.map(t => [t.name, t]));
      const next = [...list];
      seedNames.forEach(n => {
        if (!byName.has(n)) {
          const slug = n.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
          const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const email = `${slug || "teacher"}@frage.local`;
          next.push({
            id,
            name: n,
            email,
            campus: "International",
            role: "teacher",
            active: true,
            createdAt: new Date().toISOString(),
          });
        }
      });
      setTeachers(next);
      localStorage.setItem("teacher_accounts", JSON.stringify(next));
    } catch {
      setTeachers([]);
    }
    try {
      const mapRaw = localStorage.getItem("admin_teacher_class_map");
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      setAssign(map || {});
    } catch {
      setAssign({});
    }
    try {
      const raw = localStorage.getItem("admin_class_catalog");
      const list: string[] = raw ? JSON.parse(raw) : [];
      setClassCatalog(Array.isArray(list) ? list : []);
    } catch {
      setClassCatalog([]);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/students");
        const data = await res.json();
        const arr: Student[] = Array.isArray(data) ? data : data.items || [];
        setStudents(arr);
      } catch {
        setStudents([]);
      }
    };
    load();
  }, []);

  const classes = useMemo(() => {
    const set = new Set<string>([...students.map(s => s.className), ...classCatalog]);
    return Array.from(set);
  }, [students, classCatalog]);

  const filtered = useMemo(() => {
    return teachers
      .filter(t => (campusFilter === "All" ? true : t.campus === campusFilter))
      .filter(t => (query.trim() === "" ? true : t.name.toLowerCase().includes(query.toLowerCase()) || t.email.toLowerCase().includes(query.toLowerCase())));
  }, [teachers, campusFilter, query]);

  const saveOne = (id: string, value: string) => {
    const v = value.trim();
    const map = { ...assign, [id]: v };
    setAssign(map);
    localStorage.setItem("admin_teacher_class_map", JSON.stringify(map));
    try {
      const raw = localStorage.getItem("admin_class_catalog");
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = Array.from(new Set([...(Array.isArray(list) ? list : []), v]));
      localStorage.setItem("admin_class_catalog", JSON.stringify(next));
      setClassCatalog(next);
    } catch {}
  };

  const isAllowed = role === "admin";
  if (!isAllowed) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <h1 className="text-xl font-black text-slate-900">접근 권한이 없습니다</h1>
          <p className="text-sm text-slate-600 mt-2">관리자만 강사 클래스 관리를 사용할 수 있습니다.</p>
          <Link href="/admin/home" className="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-lg bg-frage-navy text-white text-sm font-bold">대시보드로 이동</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-frage-orange" />
          <h1 className="text-2xl font-black text-slate-900">교사 반 지정</h1>
        </div>
        <Link href="/admin/teachers" className="text-sm font-bold text-frage-blue">계정 관리</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색(이름/이메일)"
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">캠퍼스</label>
          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option value="All">전체</option>
            <option value="International">국제관</option>
            <option value="Andover">앤도버</option>
            <option value="Platz">플라츠</option>
            <option value="Atheneum">아테네움관</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-bold">이름</th>
                <th className="p-4 font-bold">이메일</th>
                <th className="p-4 font-bold">캠퍼스</th>
                <th className="p-4 font-bold w-64">반 지정</th>
                <th className="p-4 font-bold w-24 text-center">저장</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map(t => (
                <tr key={t.id} className="bg-white">
                  <td className="p-4 font-bold text-slate-900">{t.name}</td>
                  <td className="p-4 text-slate-700">{t.email}</td>
                  <td className="p-4 text-slate-700">{t.campus === "International" ? "국제관" : t.campus === "Andover" ? "앤도버" : t.campus === "Platz" ? "플라츠" : "아테네움관"}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={assign[t.id] || ""}
                        onChange={(e) => setAssign(prev => ({ ...prev, [t.id]: e.target.value }))}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                      >
                        <option value="">선택</option>
                        {classes.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        value={assign[t.id] || ""}
                        onChange={(e) => setAssign(prev => ({ ...prev, [t.id]: e.target.value }))}
                        placeholder="직접 입력"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                      />
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => saveOne(t.id, assign[t.id] || "")}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-frage-navy text-white"
                      aria-label="저장"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-500 text-sm" colSpan={5}>교사 계정이 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
