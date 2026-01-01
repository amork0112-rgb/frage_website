"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Video, Plus, Trash2, PencilLine, Save, X } from "lucide-react";

type Student = { id: string; name: string; englishName: string; className: string; campus: string };
type Assignment = { id: string; title: string; module: string; dueDate: string; className: string; campus?: string };

const CAMPUS_VALUES = ["All", "International", "Andover", "Atheneum", "Platz"] as const;
const CAMPUS_LABELS: Record<string, string> = {
  All: "전체",
  International: "국제관",
  Andover: "앤도버관",
  Atheneum: "아테네움관",
  Platz: "플라츠관"
};

const DEFAULT_CLASSES = ["Seed", "Sprout", "Sapling", "Tree", "Forest", "Master", "TOEFL", "Debate"];

export default function AdminVideoAssignmentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classCatalog, setClassCatalog] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("All");
  const [filterCampus, setFilterCampus] = useState<string>("All");

  const [newTitle, setNewTitle] = useState("");
  const [newModule, setNewModule] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newClass, setNewClass] = useState<string>("All");
  const [newCampus, setNewCampus] = useState<string>("All");

  const [editId, setEditId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Assignment | null>(null);

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
      try {
        const raw = localStorage.getItem("video_assignments");
        const list: Assignment[] = raw ? JSON.parse(raw) : [];
        setAssignments(Array.isArray(list) ? list : []);
      } catch {
        setAssignments([]);
      }
    };
    load();
  }, []);

  const classes = useMemo(() => {
    const set = new Set(students.map(s => s.className));
    return ["All", ...Array.from(set)];
  }, [students]);

  const campuses = useMemo(() => CAMPUS_VALUES.slice(), []);

  const filtered = useMemo(() => {
    return assignments
      .filter(a => (filterClass === "All" ? true : a.className === filterClass))
      .filter(a => (filterCampus === "All" ? true : (a.campus || "All") === filterCampus))
      .filter(a => (query.trim() === "" ? true : a.title.toLowerCase().includes(query.toLowerCase()) || a.module.toLowerCase().includes(query.toLowerCase())));
  }, [assignments, filterClass, filterCampus, query]);

  const saveAssignments = (next: Assignment[]) => {
    setAssignments(next);
    try {
      localStorage.setItem("video_assignments", JSON.stringify(next));
    } catch {}
  };

  const createAssignment = () => {
    if (!newTitle.trim() || !newModule.trim() || !newDue || newClass === "All") return;
    const item: Assignment = {
      id: `va_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newTitle.trim(),
      module: newModule.trim(),
      dueDate: newDue,
      className: newClass,
      campus: newCampus === "All" ? undefined : newCampus
    };
    const next = [item, ...assignments];
    saveAssignments(next);
    setNewTitle("");
    setNewModule("");
    setNewDue("");
    setNewClass("All");
    setNewCampus("All");
  };

  const startEdit = (id: string) => {
    const item = assignments.find(a => a.id === id) || null;
    setEditId(id);
    setEditItem(item ? { ...item } : null);
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditItem(null);
  };
  const saveEdit = () => {
    if (!editId || !editItem) return;
    if (!editItem.title.trim() || !editItem.module.trim() || !editItem.dueDate || !editItem.className) return;
    const next = assignments.map(a => (a.id === editId ? { ...editItem } : a));
    saveAssignments(next);
    setEditId(null);
    setEditItem(null);
  };
  const remove = (id: string) => {
    const next = assignments.filter(a => a.id !== id);
    saveAssignments(next);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Video className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">영상 과제 관리</h1>
        </div>
        <Link href="/admin/home" className="text-sm font-bold text-frage-blue">Admin Home</Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">반</label>
            <select value={newClass} onChange={(e) => setNewClass(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              {classes.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">캠퍼스(선택)</label>
            <select value={newCampus} onChange={(e) => setNewCampus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              {campuses.map(c => (<option key={c} value={c}>{CAMPUS_LABELS[c] || c}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">마감일</label>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">제목</label>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Into Reading 1.3" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">모듈/차시</label>
            <input value={newModule} onChange={(e) => setNewModule(e.target.value)} placeholder="[Module 5-1] Day 18" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
          </div>
        </div>
        <div className="mt-3">
          <button onClick={createAssignment} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-frage-navy text-white">
            <Plus className="w-4 h-4" /> 생성
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">반 필터</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              {classes.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">캠퍼스 필터</label>
            <select value={filterCampus} onChange={(e) => setFilterCampus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              {campuses.map(c => (<option key={c} value={c}>{CAMPUS_LABELS[c] || c}</option>))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 mb-1">검색</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목/모듈" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 space-y-1">
              {editId === a.id ? (
                <>
                  <input value={editItem?.title || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                  <input value={editItem?.module || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), module: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                  <input type="date" value={editItem?.dueDate || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), dueDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                  <select value={editItem?.className || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), className: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                    {classes.filter(c => c !== "All").map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  <select value={editItem?.campus || "All"} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), campus: e.target.value === "All" ? undefined : e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                    {campuses.map(c => (<option key={c} value={c}>{CAMPUS_LABELS[c] || c}</option>))}
                  </select>
                  <div className="flex items-center gap-2 pt-2">
                    <button onClick={saveEdit} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-frage-navy text-white">
                      <Save className="w-4 h-4" /> 저장
                    </button>
                    <button onClick={cancelEdit} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-slate-200 text-slate-700">
                      <X className="w-4 h-4" /> 취소
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-slate-900">{a.title}</div>
                  <div className="text-xs text-slate-600">{a.module}</div>
                  <div className="text-xs text-slate-500">Due {a.dueDate}</div>
                  <div className="text-xs font-bold text-slate-600 mt-1">{a.className}{a.campus ? ` • ${a.campus}` : ""}</div>
                  <div className="flex items-center gap-2 pt-2">
                    <button onClick={() => startEdit(a.id)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-white border border-slate-200">
                      <PencilLine className="w-4 h-4" /> 수정
                    </button>
                    <button onClick={() => remove(a.id)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-red-600 text-white">
                      <Trash2 className="w-4 h-4" /> 삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-slate-600">등록된 영상 과제가 없습니다.</div>
        )}
      </div>
    </main>
  );
}
