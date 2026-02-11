"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PortalHeader from "@/components/PortalHeader";
import type { Notice } from "@/data/notices";
import { Pin, Calendar, ChevronRight, ChevronDown, Archive, Megaphone, CheckCircle2, Heart, Smile } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NoticesPage() {
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [allNotices, setAllNotices] = useState<Notice[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("category", "notice")
        .order("created_at", { ascending: false });

      const rows = Array.isArray(data) ? data : [];
      const ids = rows
        .map((p: any) => Number(p.id))
        .filter((n) => !Number.isNaN(n));

      let reactionMap: Record<number, { check: number; heart: number; smile: number }> = {};

      if (ids.length > 0) {
        const { data: reactionRows } = await supabase
          .from("v_notice_reaction_counts")
          .select("notice_id,check_count,heart_count,smile_count")
          .in("notice_id", ids as any);

        if (Array.isArray(reactionRows)) {
          reactionMap = reactionRows.reduce((acc, row: any) => {
            const nid = Number(row.notice_id);
            if (Number.isNaN(nid)) return acc;
            acc[nid] = {
              check: Number(row.check_count ?? 0),
              heart: Number(row.heart_count ?? 0),
              smile: Number(row.smile_count ?? 0),
            };
            return acc;
          }, {} as Record<number, { check: number; heart: number; smile: number }>);
        }
      }

      const server: Notice[] = rows.map((p: any) => {
        const pid = Number(p.id);
        const reactions = reactionMap[pid] || { check: 0, heart: 0, smile: 0 };
        return {
          id: String(p.id),
          title: p.title,
          date: p.created_at,
          category: "Academic",
          campus: "All",
          summary: p.content || "",
          content: [],
          isPinned: !!p.is_pinned,
          pinnedOrder: undefined,
          isArchived: !!p.is_archived,
          viewCount: Number(p.view_count ?? 0),
          isRead: false,
          reactions,
        };
      });

      setAllNotices(server);
    })();
  }, []);

  const pinnedNotices = useMemo(
    () => allNotices.filter(n => n.isPinned).sort((a, b) => {
      const ao = typeof a.pinnedOrder === "number" ? a.pinnedOrder! : 9999;
      const bo = typeof b.pinnedOrder === "number" ? b.pinnedOrder! : 9999;
      return ao - bo || new Date(b.date).getTime() - new Date(a.date).getTime();
    }),
    [allNotices]
  );
  const recentNotices = useMemo(
    () => allNotices.filter(n => !n.isPinned && !n.isArchived).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allNotices]
  );
  const archivedNotices = useMemo(
    () => allNotices.filter(n => n.isArchived).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allNotices]
  );

  // Helper to format date: "4월 22일 (월)"
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      
      <main className="px-4 md:px-6 py-6 max-w-6xl mx-auto space-y-8">
        
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">공지사항</h1>
        </div>

        {/* [1] PINNED NOTICE */}
        {pinnedNotices.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3 px-1">
                <Pin className="w-4 h-4 text-frage-orange fill-frage-orange" />
                <h2 className="text-xs font-bold text-frage-orange uppercase tracking-wider">중요 공지</h2>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {pinnedNotices.map((p) => (
                <Link href={`/portal/notices/${p.id}`} key={p.id} className="block hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 px-6 py-4 min-h-[64px]">
                      {/* Left: Category */}
                      <div className="flex-shrink-0 flex items-center gap-2 w-32">
                          {!p.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          )}
                          <span className="text-[10px] font-bold text-frage-orange bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                              {p.category}
                          </span>
                      </div>
                      
                      {/* Center: Title */}
                      <div className="flex-grow min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate pr-4">{p.title}</h3>
                      </div>

                      {/* Right: Date & Arrow */}
                      <div className="flex-shrink-0 flex items-center gap-4 text-slate-400">
                          <span className="text-xs font-medium">{formatDate(p.date)}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* [2] RECENT NOTICES */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-slate-400" />
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">전체 공지</h2>
              </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {recentNotices.map((n) => (
              <Link href={`/portal/notices/${n.id}`} key={n.id} className="block hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4 px-6 py-4 min-h-[64px]">
                    {/* Left: Category */}
                    <div className="flex-shrink-0 flex items-center gap-2 w-32">
                        {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-frage-blue"></span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                            n.category === 'Schedule' ? 'text-orange-600 bg-orange-50 border-orange-100' :
                            n.category === 'Academic' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                            'text-slate-500 bg-slate-100 border-slate-200'
                        }`}>
                            {n.category}
                        </span>
                    </div>
                    
                    {/* Center: Title */}
                    <div className="flex-grow min-w-0">
                        <h3 className={`text-sm font-bold truncate pr-4 ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                            {n.title}
                        </h3>
                    </div>

                    {/* Right: Date & Arrow */}
                    <div className="flex-shrink-0 flex items-center gap-4 text-slate-400">
                        <span className="text-xs font-medium">{formatDate(n.date)}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                </div>
              </Link>
            ))}
          </div>

          {recentNotices.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Megaphone className="w-8 h-8" />
                  </div>
                  <p className="text-slate-400 font-bold">등록된 공지사항이 없습니다.</p>
              </div>
          )}
        </section>

        {/* [3] ARCHIVED NOTICES */}
        {archivedNotices.length > 0 && (
            <section className="pt-4 border-t border-slate-200">
                <button 
                    onClick={() => setIsArchiveOpen(!isArchiveOpen)}
                    className="w-full flex items-center justify-between p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4" />
                        <span className="text-sm font-bold">지난 공지사항</span>
                    </div>
                    {isArchiveOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {isArchiveOpen && (
                    <div className="mt-4 space-y-3 pl-2 border-l-2 border-slate-100 ml-4">
                        {archivedNotices.map((notice) => (
                            <Link href={`/portal/notices/${notice.id}`} key={notice.id} className="block group">
                                <div className="py-2">
                                    <div className="flex items-baseline justify-between mb-1">
                                        <h4 className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{notice.title}</h4>
                                        <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{formatDate(notice.date)}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        )}

      </main>
    </div>
  );
}
