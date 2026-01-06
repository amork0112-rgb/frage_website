"use client";

import { useEffect, useMemo, useState } from "react";
import { Upload, Plus, GraduationCap, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ClassRow = {
  id: string;
  campus: string;
  class_name: string;
  class_start_time: string | null;
  class_end_time: string | null;
  dajim_end_time: string | null;
};

const addMinutes = (hhmm: string, minutesToAdd: number) => {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const d = new Date();
  d.setHours(h, m + minutesToAdd, 0, 0);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const getDajimEndTime = (classEnd: string | null, override?: string | null) => {
  if (override && override.trim()) return override;
  if (!classEnd) return "";
  return addMinutes(classEnd, 45);
};

export default function AdminClassesPage() {
  const [role, setRole] = useState<string | null>(null);
  const [items, setItems] = useState<ClassRow[]>([]);
  const [campusFilter, setCampusFilter] = useState<string>("All");
  const [csvPreview, setCsvPreview] = useState<ClassRow[]>([]);
  const [csvConfirmOpen, setCsvConfirmOpen] = useState(false);
  const [editFor, setEditFor] = useState<ClassRow | null>(null);
  const [editStart, setEditStart] = useState<string>("");
  const [editEnd, setEditEnd] = useState<string>("");
  const [editOverrideOn, setEditOverrideOn] = useState<boolean>(false);
  const [editOverrideDajim, setEditOverrideDajim] = useState<string>("");
  const [newOpen, setNewOpen] = useState(false);
  const [newCampus, setNewCampus] = useState<string>("");
  const [newClassName, setNewClassName] = useState<string>("");
  const [newStart, setNewStart] = useState<string>("");
  const [newEnd, setNewEnd] = useState<string>("");
  const [newOverrideOn, setNewOverrideOn] = useState<boolean>(false);
  const [newOverrideDajim, setNewOverrideDajim] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const metaRole = String((data?.user?.app_metadata as any)?.role || "");
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", String(data?.user?.id || "")).maybeSingle();
        const r = String(profile?.role || metaRole || "");
        setRole(r || null);
      } catch {
        setRole(null);
      }
    })();
  }, []);

  const allowed = useMemo(() => {
    return role === "admin" || role === "staff" || role === "master_admin";
  }, [role]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from("classes").select("*").order("campus", { ascending: true }).order("class_name", { ascending: true });
        const rows = Array.isArray(data) ? data : [];
        const mapped: ClassRow[] = rows.map((r: any) => ({
          id: String(r.id),
          campus: String(r.campus || ""),
          class_name: String(r.class_name || ""),
          class_start_time: r.class_start_time ? String(r.class_start_time).slice(0, 5) : null,
          class_end_time: r.class_end_time ? String(r.class_end_time).slice(0, 5) : null,
          dajim_end_time: r.dajim_end_time ? String(r.dajim_end_time).slice(0, 5) : null,
        }));
        setItems(mapped);
      } catch {}
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((i) => campusFilter === "All" || i.campus === campusFilter);
  }, [items, campusFilter]);

  const handleCSVUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          alert("CSV 내용이 비어있습니다.");
          return;
        }
        const headers = lines[0].split(",").map((h) => h.trim());
        const idx = (name: string) => headers.indexOf(name);
        const required = ["campus", "class_name", "class_start_time", "class_end_time", "dajim_end_time"];
        const hasAll = required.every((h) => idx(h) >= 0);
        if (!hasAll) {
          alert("필수 헤더가 누락되었습니다.");
          return;
        }
        const rows = lines.slice(1);
        const parsed: ClassRow[] = rows
          .map((line) => {
            const cols = line.split(",").map((s) => s?.trim() || "");
            const campus = cols[idx("campus")] || "";
            const class_name = cols[idx("class_name")] || "";
            const class_start_time = (cols[idx("class_start_time")] || "").slice(0, 5) || null;
            const class_end_time = (cols[idx("class_end_time")] || "").slice(0, 5) || null;
            const dajim_end_time = (cols[idx("dajim_end_time")] || "").slice(0, 5) || null;
            const id = `csv_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const row: ClassRow = { id, campus, class_name, class_start_time, class_end_time, dajim_end_time };
            return row;
          })
          .filter((r) => r.campus && r.class_name);
        setCsvPreview(parsed);
        setCsvConfirmOpen(true);
      } catch {
        alert("CSV 파싱 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
  };

  const applyCSV = async () => {
    try {
      for (const r of csvPreview) {
        const { data: existing } = await supabase
          .from("classes")
          .select("id")
          .eq("campus", r.campus)
          .eq("class_name", r.class_name)
          .maybeSingle();
        const dajim = getDajimEndTime(r.class_end_time, r.dajim_end_time);
        if (existing?.id) {
          await supabase
            .from("classes")
            .update({
              campus: r.campus,
              class_name: r.class_name,
              class_start_time: r.class_start_time || null,
              class_end_time: r.class_end_time || null,
              dajim_end_time: dajim || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("classes").insert({
            campus: r.campus,
            class_name: r.class_name,
            class_start_time: r.class_start_time || null,
            class_end_time: r.class_end_time || null,
            dajim_end_time: dajim || null,
            created_at: new Date().toISOString(),
          });
        }
      }
      const { data } = await supabase.from("classes").select("*").order("campus", { ascending: true }).order("class_name", { ascending: true });
      const mapped: ClassRow[] = (Array.isArray(data) ? data : []).map((r: any) => ({
        id: String(r.id),
        campus: String(r.campus || ""),
        class_name: String(r.class_name || ""),
        class_start_time: r.class_start_time ? String(r.class_start_time).slice(0, 5) : null,
        class_end_time: r.class_end_time ? String(r.class_end_time).slice(0, 5) : null,
        dajim_end_time: r.dajim_end_time ? String(r.dajim_end_time).slice(0, 5) : null,
      }));
      setItems(mapped);
      setCsvPreview([]);
      setCsvConfirmOpen(false);
      alert("CSV 업로드가 완료되었습니다.");
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    }
  };

  const openEdit = (row: ClassRow) => {
    setEditFor(row);
    setEditStart(row.class_start_time || "");
    setEditEnd(row.class_end_time || "");
    const hasOverride = !!(row.dajim_end_time && row.dajim_end_time !== getDajimEndTime(row.class_end_time, null));
    setEditOverrideOn(hasOverride);
    setEditOverrideDajim(row.dajim_end_time || "");
  };

  const saveEdit = async () => {
    if (!editFor) return;
    const dajim = getDajimEndTime(editEnd || null, editOverrideOn ? editOverrideDajim : null);
    await supabase
      .from("classes")
      .update({
        class_start_time: editStart || null,
        class_end_time: editEnd || null,
        dajim_end_time: dajim || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editFor.id);
    setItems((prev) =>
      prev.map((i) =>
        i.id === editFor.id
          ? {
              ...i,
              class_start_time: editStart || null,
              class_end_time: editEnd || null,
              dajim_end_time: dajim || null,
            }
          : i
      )
    );
    setEditFor(null);
  };

  const saveNew = async () => {
    if (!newCampus.trim() || !newClassName.trim()) return;
    const dajim = getDajimEndTime(newEnd || null, newOverrideOn ? newOverrideDajim : null);
    const res = await supabase
      .from("classes")
      .insert({
        campus: newCampus.trim(),
        class_name: newClassName.trim(),
        class_start_time: newStart || null,
        class_end_time: newEnd || null,
        dajim_end_time: dajim || null,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    const id = String((res.data as any)?.id || `new_${Date.now()}`);
    setItems((prev) => [
      ...prev,
      {
        id,
        campus: newCampus.trim(),
        class_name: newClassName.trim(),
        class_start_time: newStart || null,
        class_end_time: newEnd || null,
        dajim_end_time: dajim || null,
      },
    ]);
    setNewOpen(false);
    setNewCampus("");
    setNewClassName("");
    setNewStart("");
    setNewEnd("");
    setNewOverrideOn(false);
    setNewOverrideDajim("");
  };

  if (!allowed) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center text-sm text-slate-600">접근 권한이 없습니다.</div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">반 시간 관리</h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold bg-white cursor-pointer">
            <span className="inline-flex items-center gap-1">
              <Upload className="w-4 h-4" />
              CSV 업로드
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCSVUpload(f);
              }}
              className="hidden"
            />
          </label>
          <button onClick={() => setNewOpen(true)} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold bg-white inline-flex items-center gap-1">
            <Plus className="w-4 h-4" />
            신규 반 추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">캠퍼스</span>
          <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="All">전체</option>
            <option value="International">국제관</option>
            <option value="Andover">앤도버</option>
            <option value="Atheneum">아테네움</option>
            <option value="Platz">플라츠</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-3 font-bold w-28">캠퍼스</th>
                <th className="p-3 font-bold w-40">반 이름</th>
                <th className="p-3 font-bold w-24 text-center">시작</th>
                <th className="p-3 font-bold w-24 text-center">종료</th>
                <th className="p-3 font-bold w-36 text-center">다짐 종료</th>
                <th className="p-3 font-bold w-24 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const auto = getDajimEndTime(r.class_end_time, null);
                const isAuto = !r.dajim_end_time || r.dajim_end_time === auto;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-700">{r.campus}</td>
                    <td className="p-3 text-slate-900 font-bold">{r.class_name}</td>
                    <td className="p-3 text-center">{r.class_start_time || ""}</td>
                    <td className="p-3 text-center">{r.class_end_time || ""}</td>
                    <td className="p-3 text-center">
                      <span className="text-slate-900 font-bold">{getDajimEndTime(r.class_end_time, r.dajim_end_time)}</span>{" "}
                      <span className={`text-xs ${isAuto ? "text-slate-400" : "text-amber-600"}`}>{isAuto ? "(자동)" : "(수정됨)"}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => openEdit(r)} className="px-2 py-1 rounded border border-slate-200 text-xs bg-white hover:bg-slate-50 inline-flex items-center gap-1">
                        <Edit className="w-4 h-4" />
                        수정
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-slate-500">등록된 반이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {csvConfirmOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCsvConfirmOpen(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[640px] max-w-[94vw] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">CSV 업로드 확인</h3>
              <button onClick={() => setCsvConfirmOpen(false)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-700">이 CSV에는 총 {csvPreview.length}개의 반이 포함되어 있습니다. 기존 반과 이름이 동일한 경우 덮어씁니다.</div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                        <th className="p-2 font-bold">캠퍼스</th>
                        <th className="p-2 font-bold">반</th>
                        <th className="p-2 font-bold">시작</th>
                        <th className="p-2 font-bold">종료</th>
                        <th className="p-2 font-bold">다짐 종료</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csvPreview.slice(0, 50).map((r) => (
                        <tr key={r.id}>
                          <td className="p-2">{r.campus}</td>
                          <td className="p-2">{r.class_name}</td>
                          <td className="p-2 text-center">{r.class_start_time || ""}</td>
                          <td className="p-2 text-center">{r.class_end_time || ""}</td>
                          <td className="p-2 text-center">{getDajimEndTime(r.class_end_time, r.dajim_end_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setCsvConfirmOpen(false)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">취소</button>
                <button onClick={applyCSV} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">확인</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editFor && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditFor(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[560px] max-w-[94vw] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">반 시간 수정</h3>
              <button onClick={() => setEditFor(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">캠퍼스</span>
                  <span className="text-sm font-bold text-slate-800">{editFor.campus}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">반</span>
                  <span className="text-sm font-bold text-slate-800">{editFor.class_name}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">수업 시작 시각</span>
                  <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">수업 종료 시각</span>
                  <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">다짐 종료 시각</span>
                  {!editOverrideOn && <span className="text-xs text-slate-500">{getDajimEndTime(editEnd || null, null)} (자동)</span>}
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editOverrideOn} onChange={(e) => setEditOverrideOn(e.target.checked)} className="rounded border-slate-300" />
                  <span>다짐 종료 시각 직접 지정</span>
                </label>
                {editOverrideOn && (
                  <input type="time" value={editOverrideDajim} onChange={(e) => setEditOverrideDajim(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                )}
                <div className="text-xs text-amber-700">이 반에 속한 학생들의 차량 시간에 영향을 줍니다.</div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={saveEdit} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {newOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNewOpen(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[560px] max-w-[94vw] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">신규 반 추가</h3>
              <button onClick={() => setNewOpen(false)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">캠퍼스</span>
                  <select value={newCampus} onChange={(e) => setNewCampus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="">선택</option>
                    <option value="International">국제관</option>
                    <option value="Andover">앤도버</option>
                    <option value="Atheneum">아테네움</option>
                    <option value="Platz">플라츠</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">반 이름</span>
                  <input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">수업 시작 시각</span>
                  <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">수업 종료 시각</span>
                  <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">다짐 종료 시각</span>
                  {!newOverrideOn && <span className="text-xs text-slate-500">{getDajimEndTime(newEnd || null, null)} (자동)</span>}
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newOverrideOn} onChange={(e) => setNewOverrideOn(e.target.checked)} className="rounded border-slate-300" />
                  <span>다짐 종료 시각 직접 지정</span>
                </label>
                {newOverrideOn && (
                  <input type="time" value={newOverrideDajim} onChange={(e) => setNewOverrideDajim(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={saveNew}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                  disabled={!newCampus.trim() || !newClassName.trim()}
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
