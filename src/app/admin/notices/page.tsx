// src/app/admin/notices/page.tsx
"use client";

import Link from "next/link";
import { Plus, Edit2, Trash2, Pin, MapPin, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";

export default function AdminNoticesPage() {
  const [serverNotices, setServerNotices] = useState<any[]>([]);
  const [animMap, setAnimMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("category", "notice")
          .eq("scope", "global") // Admin scope
          .eq("is_archived", false)
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data)) {
          const ids = data
            .map((p: any) => Number(p.id))
            .filter((n: number) => !Number.isNaN(n));
          let promoMap: Record<number, { pinned: boolean; push_enabled: boolean }> = {};
          if (ids.length > 0) {
            const { data: promos } = await supabase
              .from("notice_promotions")
              .select("post_id,pinned,push_enabled")
              .in("post_id", ids);
            (promos || []).forEach((row: any) => {
              const pid = Number(row.post_id);
              if (!Number.isNaN(pid)) {
                promoMap[pid] = {
                  pinned: !!row.pinned,
                  push_enabled: !!row.push_enabled,
                };
              }
            });
          }
          const mapped = data.map((p: any) => {
            const pid = Number(p.id);
            const promo = promoMap[pid];
            return {
              id: String(p.id),
              title: p.title,
              date: p.created_at,
              category: "Schedule",
              campus: p.campus ?? "All",
              summary: p.content || "",
              richHtml: "",
              images: [],
              files: [],
              viewCount: 0,
              isPinned: !!p.is_pinned,
              isArchived: !!p.is_archived,
              hasNews: p.scope === "global" && !!promo,
              newsPinned: !!promo?.pinned,
              newsPushEnabled: !!promo?.push_enabled,
            };
          });
          setServerNotices(mapped);
        }
      } catch {}
    })();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric" });
  };

  const mergedNotices = useMemo(() => {
    return [...serverNotices].sort((a: any, b: any) => {
      const aw = a.isPinned ? 0 : a.isArchived ? 2 : 1;
      const bw = b.isPinned ? 0 : b.isArchived ? 2 : 1;
      if (aw !== bw) return aw - bw;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [serverNotices]);

  const pinnedCount = useMemo(() => mergedNotices.filter((n: any) => n.isPinned && !n.isArchived).length, [mergedNotices]);

  const updateOverride = async (id: string, next: Partial<{ isPinned: boolean; isArchived: boolean }>) => {
    try {
      const status = next.isPinned ? "pinned" : next.isArchived ? "archived" : "published";
      const res = await fetch("/api/admin/notices/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error("sync_failed");
      setServerNotices((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isPinned: status === "pinned", isArchived: status === "archived" } : n))
      );
    } catch {
      alert("상태 동기화 중 오류가 발생했습니다.");
    }
  };

  const cycleStatus = async (item: any) => {
    const id = item.id;
    const currentPinned = !!item.isPinned;
    const currentArchived = !!item.isArchived;
    setAnimMap((m) => ({ ...m, [id]: true }));
    setTimeout(async () => {
      if (!currentPinned && !currentArchived) {
        if (pinnedCount >= 5) {
          alert("상단 고정은 최대 5개까지 가능합니다.");
          setAnimMap((m) => ({ ...m, [id]: false }));
          return;
        }
        await updateOverride(id, { isPinned: true, isArchived: false });
        setAnimMap((m) => ({ ...m, [id]: false }));
        return;
      }
      if (currentPinned) {
        await updateOverride(id, { isPinned: false, isArchived: true });
        setAnimMap((m) => ({ ...m, [id]: false }));
        return;
      }
      if (currentArchived) {
        await updateOverride(id, { isPinned: false, isArchived: false });
        setAnimMap((m) => ({ ...m, [id]: false }));
        return;
      }
    }, 150);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 공지사항을 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
      setServerNotices((prev) => prev.filter((n) => n.id !== id));
      alert("삭제되었습니다.");
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류가 발생했습니다.");
    }
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                        <th className="px-3 py-3 font-bold w-16 text-center">No.</th>
                        <th className="px-3 py-3 font-bold w-24 text-center">상태</th>
                        <th className="px-3 py-3 font-bold w-24">캠퍼스</th>
                        <th className="px-3 py-3 font-bold">제목</th>
                        <th className="px-3 py-3 font-bold w-24">카테고리</th>
                        <th className="px-3 py-3 font-bold w-28">작성일</th>
                        <th className="px-3 py-3 font-bold w-20 text-center">조회수</th>
                        <th className="px-3 py-3 font-bold w-24 text-center">관리</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {mergedNotices.map((notice: any, idx: number) => (
                        <tr key={notice.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-3 py-3 text-center">
                                <p
                                  onClick={() => cycleStatus(notice)}
                                  className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-opacity duration-200 cursor-pointer ${
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
                            <td className="px-3 py-3 whitespace-nowrap">
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
                            <td className="px-3 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex flex-col">
                                    <p className="font-bold text-slate-800 line-clamp-1">{notice.title}</p>
                                  </div>
                                  {notice.hasNews && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-600 border-blue-100 whitespace-nowrap">
                                      NEWS
                                      {notice.newsPinned && <Pin className="w-3 h-3" />}
                                      {notice.newsPushEnabled && <Upload className="w-3 h-3" />}
                                    </span>
                                  )}
                                </div>
                            </td>
                            <td className="px-3 py-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${notice.category === 'Schedule' ? 'bg-orange-50 text-frage-orange border-orange-100' : notice.category === 'Academic' ? 'bg-blue-50 text-blue-600 border-blue-100' : notice.category === 'Event' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{notice.category}</span>
                            </td>
                            <td className="px-3 py-3 text-slate-600 font-medium whitespace-nowrap">
                                {formatDate(notice.date)}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-600 whitespace-nowrap">
                                {notice.viewCount}
                            </td>
                            <td className="px-3 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Link href={`/admin/notices/${notice.id}/edit`} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="수정">
                                        <Edit2 className="w-4 h-4" />
                                    </Link>
                                    <button 
                                      onClick={() => handleDelete(notice.id)}
                                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                                      title="삭제"
                                    >
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
