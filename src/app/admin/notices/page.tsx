// src/app/admin/notices/page.tsx
"use client";

import Link from "next/link";
import { Plus, Edit2, Trash2, Pin, MapPin, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminNoticesPage() {
  const [serverNotices, setServerNotices] = useState<any[]>([]);
  const [animMap, setAnimMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/notices?limit=100");
        const json = await res.json();
        
        if (!res.ok) throw new Error(json.error || "Failed to fetch notices");
        
        if (Array.isArray(json.data)) {
          const mapped = json.data.map((p: any) => {
            // ✅ API에서 이미 join된 notice_promotions 데이터를 사용
            // (서버 API가 notice_promotions 정보를 포함해서 내려주도록 수정 필요)
            // 현재 구조상 API 수정이 어렵다면, 별도 API 호출이 필요하지만
            // 사용자 요청은 "프론트에서 직접 DB 호출 금지"이므로 
            // API가 notice_promotions 정보를 포함해서 내려주는 것이 가장 이상적임.
            // 하지만 /api/admin/notices/route.ts를 보면 현재는 posts만 조회함.
            // 따라서 API 수정이 선행되어야 함.
            
            // 일단 여기서는 API 응답에 notice_promotions 정보가 포함된다고 가정하거나,
            // 별도 API를 만들어야 함.
            // 사용자 요청: "notice_promotions는 오직 서버 API에서만 접근"
            
            // 임시로 client-side join 로직을 제거하고, API가 데이터를 주도록 변경해야 함.
            // 지금은 API가 posts만 주므로, 화면에 NEWS 배지가 안 나올 수 있음.
            // API 수정(Todo 4)에서 이 부분을 처리해야 함.
            
            const promo = p.notice_promotions?.[0] || p.notice_promotions; 
            
            return {
              id: String(p.id),
              title: p.title,
              date: p.created_at,
              category: p.category ?? "Schedule",
              campus: p.campus ?? "All",
              summary: p.content || "",
              richHtml: "",
              images: [],
              files: [],
              viewCount: p.view_count ?? 0,
              isPinned: !!p.is_pinned,
              isArchived: !!p.is_archived,
              // ✅ Fix: Ensure hasNews checks actual promotion existence from API response
              hasNews: !!promo && promo.archived === false,
              newsPinned: !!promo?.pinned,
              newsPushEnabled: !!promo?.push_enabled,
            };
          });
          setServerNotices(mapped);
        }
      } catch (err) {
        console.error(err);
      }
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
      const res = await fetch(`/api/admin/notices?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete");
      }

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
