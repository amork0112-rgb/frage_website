"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, Save, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

export default function AdminTeacherClassesPage() {
  const [role, setRole] = useState<"admin" | "teacher" | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assign, setAssign] = useState<Record<string, string[]>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [campusFilter, setCampusFilter] = useState<"All" | Teacher["campus"]>("All");
  const [classCatalog, setClassCatalog] = useState<string[]>([]);
  const [addSelect, setAddSelect] = useState<Record<string, string>>({});
  const [addInput, setAddInput] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const appRole = (data?.user?.app_metadata as any)?.role ?? null;
        const mapped =
          appRole === "admin" || appRole === "master_admin"
            ? "admin"
            : appRole === "teacher"
            ? "teacher"
            : null;
        setRole(mapped);
      } catch {
        setRole(null);
      }
      try {
        const res = await fetch("/api/admin/teachers");
        const data = await res.json();
        const list: Teacher[] = Array.isArray(data)
          ? data.map((row: any) => ({
              id: String(row.id),
              name: String(row.name ?? ""),
              email: String(row.email ?? ""),
              campus: (String(row.campus ?? "International") as Teacher["campus"]),
              role: (String(row.role ?? "teacher") as Teacher["role"]),
              active: !!row.active,
              createdAt: String(row.createdAt ?? new Date().toISOString()),
            }))
          : [];
        setTeachers(list);
      } catch {
        setTeachers([]);
      }
      try {
        const { data } = await supabase.from("teacher_classes").select("*");
        const map: Record<string, string[]> = {};
        (Array.isArray(data) ? data : []).forEach((row: any) => {
          const tid = String(row.teacher_id);
          const cls = String(row.class_name ?? "");
          if (!tid || !cls) return;
          map[tid] = Array.from(new Set([...(map[tid] || []), cls]));
        });
        setAssign(map);
      } catch {
        setAssign({});
      }
      try {
        const res = await fetch("/api/admin/classes");
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const names = items.map((c: any) => c.name).filter(Boolean);
        setClassCatalog(names);
      } catch {
        setClassCatalog([]);
      }
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/students");
        const data = await res.json();
        const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const mapped: Student[] = rows.map((r: any) => ({
          id: String(r.student_id ?? r.id ?? ""),
          name: String(r.student_name ?? ""),
          englishName: String(r.english_first_name ?? ""),
          className: String(r.class_name ?? ""),
          campus: String(r.campus ?? ""),
        }));
        setStudents(mapped);
      } catch {
        setStudents([]);
      }
    };
    load();
  }, []);

  const classes = useMemo(() => {
    const set = new Set<string>([...students.map(s => s.className), ...classCatalog]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students, classCatalog]);

  const filtered = useMemo(() => {
    return teachers
      .filter(t => (campusFilter === "All" ? true : t.campus === campusFilter))
      .filter(t => (query.trim() === "" ? true : t.name.toLowerCase().includes(query.toLowerCase()) || t.email.toLowerCase().includes(query.toLowerCase())));
  }, [teachers, campusFilter, query]);

  const saveOne = (id: string, values: string[]) => {
    const uniq = Array.from(new Set(values.map(v => v.trim()).filter(Boolean))).slice(0, 5);
    const map = { ...assign, [id]: uniq };
    setAssign(map);
    (async () => {
      try {
        const res = await fetch("/api/admin/teacher-classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId: id, classNames: uniq }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          alert("저장에 실패했습니다.");
          // Optionally revert state here if needed, but for now we just alert
        } else {
          alert("저장되었습니다.");
        }
      } catch {
        alert("저장 중 오류가 발생했습니다.");
      }
    })();
  };
  const addClass = (id: string) => {
    const fromSelect = (addSelect[id] || "").trim();
    const fromInput = (addInput[id] || "").trim();
    const candidate = fromInput || fromSelect;
    if (!candidate) return;
    const current = assign[id] || [];
    if (current.length >= 5) return;
    const next = Array.from(new Set([...current, candidate]));
    setAssign(prev => ({ ...prev, [id]: next }));
    setAddInput(prev => ({ ...prev, [id]: "" }));
  };
  const removeClass = (id: string, value: string) => {
    const current = assign[id] || [];
    const next = current.filter(v => v !== value);
    setAssign(prev => ({ ...prev, [id]: next }));
  };

  const isAllowed = role === "admin";
  const canEdit = role === "admin";
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
                <th className="p-4 font-bold w-96">반 지정</th>
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={addSelect[t.id] || ""}
                          onChange={(e) => setAddSelect(prev => ({ ...prev, [t.id]: e.target.value }))}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                          disabled={!canEdit}
                        >
                          <option value="">선택</option>
                          {classes.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          value={addInput[t.id] || ""}
                          onChange={(e) => setAddInput(prev => ({ ...prev, [t.id]: e.target.value }))}
                          placeholder="직접 입력"
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                          disabled={!canEdit}
                        />
                        <button
                          onClick={() => addClass(t.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-bold ${canEdit ? "bg-frage-navy text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                          disabled={!canEdit}
                        >
                          추가
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(assign[t.id] || []).map(c => (
                          <span key={c} className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                            {c}
                            <button
                              onClick={() => removeClass(t.id, c)}
                              className={`w-5 h-5 rounded-full flex items-center justify-center ${canEdit ? "bg-slate-200 text-slate-600" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
                              disabled={!canEdit}
                              aria-label="remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {(assign[t.id] || []).length === 0 && (
                          <span className="text-xs text-slate-400">지정된 반이 없습니다</span>
                        )}
                        {(assign[t.id] || []).length >= 5 && (
                          <span className="text-xs text-red-500 font-bold">최대 5반까지 지정 가능합니다</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => saveOne(t.id, assign[t.id] || [])}
                      className={`inline-flex items-center justify-center px-3 py-2 rounded-lg ${canEdit ? "bg-frage-navy text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                      disabled={!canEdit}
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
