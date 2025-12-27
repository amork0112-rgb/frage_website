"use client";

import Link from "next/link";
import { notices } from "@/data/notices";
import { Plus, Edit2, Trash2, Pin, MapPin, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function AdminNoticesPage() {
  const [dynamicNotices, setDynamicNotices] = useState<any[]>([]);
  const [draft, setDraft] = useState<any | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { isPinned?: boolean; isArchived?: boolean }>>({});
  const [statusLogs, setStatusLogs] = useState<Record<string, string[]>>({});
  const [animMap, setAnimMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const key = "frage_notices";
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    setDynamicNotices(arr);
    const d = localStorage.getItem("frage_notice_draft");
    setDraft(d ? JSON.parse(d) : null);
    const ov = JSON.parse(localStorage.getItem("frage_notice_overrides") || "{}");
    setOverrides(ov);
    const logs = JSON.parse(localStorage.getItem("frage_notice_status_logs") || "{}");
    setStatusLogs(logs);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric" });
  };

  const mergedNotices = useMemo(() => {
    const base = [...dynamicNotices, ...notices];
    return base
      .map((n) => {
        const o = overrides[n.id] || {};
        return { ...n, isPinned: o.isPinned ?? n.isPinned, isArchived: o.isArchived ?? n.isArchived };
      })
      .sort((a: any, b: any) => {
        const aw = a.isPinned ? 0 : a.isArchived ? 2 : 1;
        const bw = b.isPinned ? 0 : b.isArchived ? 2 : 1;
        if (aw !== bw) return aw - bw;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [dynamicNotices, overrides]);

  const pinnedCount = useMemo(() => mergedNotices.filter((n: any) => n.isPinned && !n.isArchived).length, [mergedNotices]);

  const appendLog = (id: string, text: string) => {
    const map = { ...statusLogs };
    const list = map[id] || [];
    list.push(text);
    map[id] = list;
    setStatusLogs(map);
    localStorage.setItem("frage_notice_status_logs", JSON.stringify(map));
  };

  const updateOverride = async (id: string, next: Partial<{ isPinned: boolean; isArchived: boolean }>, currentLabel: string) => {
    const map = { ...overrides, [id]: { ...(overrides[id] || {}), ...next } };
    setOverrides(map);
    localStorage.setItem("frage_notice_overrides", JSON.stringify(map));
    try {
      const status = next.isPinned ? "pinned" : next.isArchived ? "archived" : "published";
      const res = await fetch("/api/admin/notices/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error("sync_failed");
      appendLog(id, `${new Date().toLocaleString("ko-KR")} 상태 변경: ${currentLabel} → ${status}`);
    } catch {
      alert("상태 동기화 중 오류가 발생했습니다.");
    }
  };

  const cycleStatus = async (item: any) => {
    const id = item.id;
    const currentPinned = !!item.isPinned;
    const currentArchived = !!item.isArchived;
    const label = currentPinned ? "pinned" : currentArchived ? "archived" : "published";
    setAnimMap((m) => ({ ...m, [id]: true }));
    setTimeout(async () => {
      if (!currentPinned && !currentArchived) {
        if (pinnedCount >= 5) {
          alert("상단 고정은 최대 5개까지 가능합니다.");
          setAnimMap((m) => ({ ...m, [id]: false }));
          return;
        }
        await updateOverride(id, { isPinned: true, isArchived: false }, label);
        setAnimMap((m) => ({ ...m, [id]: false }));
        return;
      }
      if (currentPinned) {
        await updateOverride(id, { isPinned: false, isArchived: true }, label);
        setAnimMap((m) => ({ ...m, [id]: false }));
        return;
      }
      if (currentArchived) {
        await updateOverride(id, { isPinned: false, isArchived: false }, label);
        setAnimMap((m) => ({ ...m, [id]: false }));
        return;
      }
    }, 150);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-black text-slate-900">공지사항 관리</h1>
            <p className="text-slate-500 mt-1">학부모 포털에 노출될 공지사항을 작성하고 관리합니다. 상태를 누르면 게시중 → 고정 → 보관으로 변경됩니다.</p>
        </div>
        <Link 
            href="/admin/notices/new" 
            className="inline-flex items-center justify-center gap-2 bg-frage-navy text-white font-bold px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors shadow-sm"
        >
            <Plus className="w-5 h-5" />
            새 공지 작성
        </Link>
      </div>

      {draft && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5" />
            <div>
              <p className="text-sm font-bold">임시 저장된 공지가 있습니다</p>
              <p className="text-xs text-yellow-700 mt-0.5">제목: {draft.title || "(제목 없음)"} • 캠퍼스: {draft.campus || "All"} • 카테고리: {draft.category || "Schedule"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/notices/new" className="px-3 py-2 rounded-lg text-xs font-bold bg-yellow-100 hover:bg-yellow-200 transition-colors">불러오기</Link>
            <button
              onClick={() => { localStorage.removeItem("frage_notice_draft"); setDraft(null); }}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-yellow-200 hover:bg-yellow-100 transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                        <th className="p-4 font-bold w-16 text-center">No.</th>
                        <th className="p-4 font-bold w-24 text-center">상태</th>
                        <th className="p-4 font-bold w-32">캠퍼스</th>
                        <th className="p-4 font-bold">제목</th>
                        <th className="p-4 font-bold w-32">카테고리</th>
                        <th className="p-4 font-bold w-32">작성일</th>
                        <th className="p-4 font-bold w-24 text-center">조회수</th>
                        <th className="p-4 font-bold w-32 text-center">관리</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {mergedNotices.map((notice: any, idx: number) => (
                        <tr key={notice.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-4 text-center">
                                <p
                                  onClick={() => cycleStatus(notice)}
                                  className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-opacity duration-200 ${
                                    animMap[notice.id] ? "opacity-0" : "opacity-100"
                                  } ${
                                    notice.isPinned
                                      ? "bg-orange-50 text-frage-orange border-orange-100"
                                      : notice.isArchived
                                      ? "bg-slate-100 text-slate-400 border-slate-200"
                                      : "bg-green-50 text-green-600 border-green-100"
                                  }`}
                                  aria-label={notice.isPinned ? "다음: 보관함으로 이동" : notice.isArchived ? "다음: 게시중으로 이동" : "다음: 고정으로 이동"}
                                >
                                  {notice.isPinned ? <Pin className="w-3 h-3" /> : null}
                                  {notice.isPinned ? "고정됨" : notice.isArchived ? "보관됨" : "게시중"}
                                </p>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span className={`font-bold ${
                                        notice.campus === 'All' ? 'text-frage-orange' :
                                        notice.campus === 'International' ? 'text-blue-600' :
                                        notice.campus === 'Andover' ? 'text-purple-600' :
                                        'text-slate-600'
                                    }`}>
                                        {notice.campus === 'All' ? '전체' :
                                         notice.campus === 'International' ? '국제관' :
                                         notice.campus === 'Andover' ? '앤도버' :
                                         notice.campus === 'Platz' ? '플라츠' : notice.campus}
                                    </span>
                                </div>
                            </td>
                            <td className="p-4">
                                <p className="font-bold text-slate-800 line-clamp-1">{notice.title}</p>
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{notice.summary}</p>
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${notice.category === 'Schedule' ? 'bg-orange-50 text-frage-orange border-orange-100' : notice.category === 'Academic' ? 'bg-blue-50 text-blue-600 border-blue-100' : notice.category === 'Event' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{notice.category}</span>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">
                                {formatDate(notice.date)}
                            </td>
                            <td className="p-4 text-center text-slate-600">
                                {notice.viewCount}
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Link href={`/admin/notices/${notice.id}/edit`} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="수정">
                                        <Edit2 className="w-4 h-4" />
                                    </Link>
                                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </main>
  );
}
