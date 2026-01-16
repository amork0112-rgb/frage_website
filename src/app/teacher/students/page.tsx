"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type Status = "waiting" | "consultation_reserved" | "consult_done" | "approved" | "promoted" | "rejected" | "hold";

type Student = {
  id: string;
  childId?: string;
  name: string;
  englishName: string;
  birthDate: string;
  phone: string;
  className: string; 
  campus: string;
  status: Status;
  parentName: string;
  parentAccountId: string;
  address: string;
  bus: string;
  departureTime: string;
};

export default function TeacherStudentsPage() {
  const [query, setQuery] = useState<string>("");
  const [teacherClass, setTeacherClass] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [updates, setUpdates] = useState<Record<string, { className?: string; status?: Status; englishName?: string; bus?: string; departureTime?: string }>>({});
  const [memos, setMemos] = useState<Record<string, { text: string; author: string; at: string; tag?: "상담" | "결제" | "특이사항" | "기타" }[]>>({});
  const [infoStudent, setInfoStudent] = useState<Student | null>(null);
  const [memoOpenFor, setMemoOpenFor] = useState<Student | null>(null);
  const [newMemo, setNewMemo] = useState<string>("");
  const [newMemoType, setNewMemoType] = useState<"상담" | "결제" | "특이사항" | "기타">("기타");
  const memoInputRef = useRef<HTMLInputElement | null>(null);
  const [memoPanelVisible, setMemoPanelVisible] = useState(false);
  const [parentPhotos, setParentPhotos] = useState<string[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>("All");
  const CAMPUSES = ["All", "International", "Andover", "Platz", "Atheneum"];

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      const roleMeta = (user?.app_metadata as any)?.role;
      if (roleMeta === "teacher") {
        const { data: teacherClassRow } = await supabase
          .from("teacher_classes")
          .select("class_name")
          .eq("teacher_id", user?.id)
          .maybeSingle();
        setTeacherClass((teacherClassRow as any)?.class_name || null);
      } else {
        setTeacherClass(null);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const normalizedClassId = !teacherClass || teacherClass === "-" || teacherClass === "all" ? undefined : teacherClass;
        const res = await fetch(`/api/teacher/students?classId=${normalizedClassId ?? ""}&campus=${selectedCampus}`, { cache: "no-store", credentials: "include" });
        if (!res.ok) {
          console.error("Failed to load students", res.status);
          setStudents([]);
          return;
        }
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setStudents(items);
      } catch {}
    };
    load();
  }, [teacherClass, selectedCampus]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("student_memos")
        .select("*")
        .order("created_at", { ascending: false });
      const rows = Array.isArray(data) ? data : [];
      const map: Record<string, { text: string; author: string; at: string; tag?: "상담" | "결제" | "특이사항" | "기타" }[]> = {};
      rows.forEach((m: any) => {
        const sid = String(m.student_id);
        if (!map[sid]) map[sid] = [];
        map[sid].push({
          text: String(m.text ?? ""),
          author: String(m.author ?? ""),
          at: String(m.created_at ?? m.at ?? ""),
          tag: (m.tag as any) ?? "기타",
        });
      });
      setMemos(map);
    };
    load();
  }, []);

  const merged = useMemo(() => {
    return students.map(s => ({ ...s, ...(updates[s.id] || {}) }));
  }, [students, updates]);

  const filtered = useMemo(() => {
    return merged
      .filter(s => !["rejected"].includes(s.status))
      .filter(s => !teacherClass || s.className === teacherClass)
      .filter(s => query === "" || s.name.includes(query) || s.englishName.toLowerCase().includes(query.toLowerCase()));
  }, [merged, teacherClass, query]);

  const previewText = (s: string) => {
    const t = (s || "").trim();
    const lines = t.split(/\r?\n/).slice(0, 2).join(" ");
    return lines.length > 200 ? lines.slice(0, 200) + "…" : lines;
  };

  const openInfoPanel = (s: Student) => {
    setInfoStudent(s);
    setMemoOpenFor(null);
    setParentPhotos([]);
  };

  const openMemoPanel = (s: Student) => {
    setMemoOpenFor(s);
    setInfoStudent(null);
  };

  useEffect(() => {
    setMemoPanelVisible(!!memoOpenFor);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMemoOpenFor(null);
        setMemoPanelVisible(false);
      }
    };
    if (memoOpenFor) {
      window.addEventListener("keydown", onKey);
      setTimeout(() => {
        memoInputRef.current?.focus();
      }, 0);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [memoOpenFor]);

  const saveMemo = () => {
    if (!memoOpenFor || !newMemo.trim()) return;
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const author = String(data?.user?.email ?? "담임");
      const at = new Date().toISOString();
      await supabase.from("student_memos").insert({
        student_id: memoOpenFor.id,
        text: newMemo.trim(),
        author,
        tag: newMemoType,
        at,
      });
      const next = { ...memos };
      const list = next[memoOpenFor.id] || [];
      list.unshift({ text: newMemo.trim(), author, at, tag: newMemoType });
      next[memoOpenFor.id] = list;
      setMemos(next);
      setNewMemo("");
      setNewMemoType("기타");
    };
    run();
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">Student List</h1>
        </div>
        <Link href="/teacher/alerts" className="text-sm font-bold text-frage-blue">내부 알림</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-6">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="이름 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-frage-blue outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700 whitespace-nowrap">캠퍼스</span>
          <select
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-frage-blue outline-none"
          >
            {CAMPUSES.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "전체" : c === "International" ? "국제관" : c === "Andover" ? "앤도버" : c === "Platz" ? "플라츠" : "아테네움관"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700 whitespace-nowrap">담임 반</span>
          <div className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white whitespace-nowrap overflow-hidden text-ellipsis">
            {teacherClass || "전체"}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-3 font-bold">이름</th>
                <th className="p-3 font-bold w-40">영어이름</th>
                <th className="p-3 font-bold w-28">캠퍼스</th>
                <th className="p-3 font-bold w-28">반</th>
                <th className="p-3 font-bold w-28">재원상태</th>
                <th className="p-3 font-bold w-24 text-center">호차</th>
                <th className="p-3 font-bold w-24 text-center">하원 시간대</th>
                <th className="p-3 font-bold w-24 text-center">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 50).map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <button onClick={() => openInfoPanel(s)} className="text-slate-900 font-bold hover:underline">{s.name}</button>
                    <div className="text-xs text-slate-400">{s.phone}</div>
                  </td>
                  <td className="p-3 text-slate-700">{s.englishName}</td>
                  <td className="p-3 text-slate-700">{s.campus}</td>
                  <td className="p-3 text-slate-700">{s.className}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-[11px] font-bold border ${
                      s.status === "promoted" ? "bg-green-50 text-green-700 border-green-100" :
                      s.status === "hold" ? "bg-amber-50 text-amber-700 border-amber-100" :
                      s.status === "rejected" ? "bg-red-50 text-red-700 border-red-100" :
                      "bg-slate-50 text-slate-700 border-slate-100"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">{s.bus}</td>
                  <td className="p-3 text-center">{s.departureTime}</td>
                  <td className="p-3">
                    {Array.isArray(memos[s.id]) && memos[s.id].length > 0 ? (
                      <button
                        onClick={() => openMemoPanel(s)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-sm bg-white hover:bg-slate-100 max-w-[220px] text-left transition-all"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        <span className="text-slate-700">[{memos[s.id][0].tag || "기타"}] {previewText(memos[s.id][0].text)}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => openMemoPanel(s)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-sm font-bold bg-white hover:bg-slate-100 transition-all flex items-center gap-1 justify-center"
                      >
                        <span aria-hidden="true">📝</span>
                        <span>추가</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-slate-500">표시할 학생이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {infoStudent && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInfoStudent(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[520px] max-w-[90vw] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-slate-900">학생 정보</h3>
              <button onClick={() => setInfoStudent(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">학생 이름</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">영문명</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.englishName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">생년월일</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.birthDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">전화번호</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">학부모 성함</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.parentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">학부모 아이디</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.parentAccountId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">주소</span>
                <span className="text-sm font-bold text-slate-800 text-right">{infoStudent.address}</span>
              </div>
              <div className="pt-3">
                <div className="text-xs font-bold text-slate-400 mb-2">학부모 업로드 사진</div>
                {parentPhotos.length === 0 ? (
                  <div className="text-sm text-slate-500">업로드된 사진이 없습니다.</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {parentPhotos.slice(0, 9).map((src, i) => (
                      <div key={i} className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-200">
                        <Image src={src} alt={`parent-photo-${i}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {memoOpenFor && (
        <div className="fixed inset-0 z-30" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={() => setMemoOpenFor(null)} />
          <div
            className={`absolute right-0 top-0 bottom-0 w-[420px] bg-white border-l border-slate-200 shadow-xl p-5 flex flex-col transition-transform duration-300 ease-out ${memoPanelVisible ? "translate-x-0" : "translate-x-full"}`}
            tabIndex={0}
          >
            <h3 id="memo-panel-title" className="text-lg font-black text-slate-900 mb-4">메모</h3>
            <div className="flex-1 overflow-auto space-y-2">
              {(memos[memoOpenFor.id] || []).map((m, i) => (
                <div key={i} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-xs font-bold text-slate-600 mb-1">[{m.tag || "기타"}]</div>
                  <div className="text-sm text-slate-800 break-words whitespace-pre-line">{m.text}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{m.author} • {new Date(m.at).toLocaleString("ko-KR")}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <select
                value={newMemoType}
                onChange={(e) => setNewMemoType(e.target.value as any)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="기타">기타</option>
                <option value="상담">상담</option>
                <option value="결제">결제</option>
                <option value="특이사항">특이사항</option>
              </select>
              <input
                type="text"
                ref={memoInputRef}
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                placeholder="메모 한 줄"
                aria-label="새 메모 입력"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              />
              <button onClick={saveMemo} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">저장</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
