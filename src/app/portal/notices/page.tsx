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
      
      <main className="px-4 py-6 max-w-xl mx-auto space-y-8">
        
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
            <div className="space-y-3">
              {pinnedNotices.map((p) => (
                <Link href={`/portal/notices/${p.id}`} key={p.id}>
                  <div className="bg-white p-5 rounded-2xl border-l-4 border-frage-orange shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                      <div className="flex justify-between items-start gap-4">
                          <div>
                              <div className="flex items-center gap-2 mb-2">
                                  {!p.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                  )}
                                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{p.title}</h3>
                                  {typeof p.pinnedOrder === "number" && (
                                    <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-frage-orange border border-orange-100">#{p.pinnedOrder}</span>
                                  )}
                              </div>
                              <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{p.summary}</p>
                          </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-400">
                          <div className="flex items-center gap-2">
                              <span>{formatDate(p.date)}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                              <span className="text-frage-orange">{p.category}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {p.reactions.check}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {p.reactions.heart}
                              </span>
                              <span className="flex items-center gap-1">
                                <Smile className="w-3 h-3" />
                                {p.reactions.smile}
                              </span>
                            </div>
                            <span className="text-slate-400">조회 {p.viewCount}</span>
                          </div>
                      </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* [2] RECENT NOTICES */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
              <Megaphone className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">최신 소식</h2>
          </div>

          <div className="space-y-4">
            {recentNotices.map((notice) => (
              <Link href={`/portal/notices/${notice.id}`} key={notice.id} className="block group">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md transition-all active:bg-slate-50 relative overflow-hidden">
                    {/* Unread Indicator */}
                    {!notice.isRead && (
                        <div className="absolute top-0 right-0 w-12 h-12">
                            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full m-3 shadow-sm animate-pulse"></div>
                        </div>
                    )}

                    <div className="flex flex-col gap-1 mb-2">
                        <div className="flex justify-between items-center pr-4">
                            <span className="text-xs font-bold text-slate-400">{formatDate(notice.date)}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                notice.category === 'Academic' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                notice.category === 'Event' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                'bg-slate-50 text-slate-500 border-slate-100'
                            }`}>
                                {notice.category}
                            </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-frage-blue transition-colors pr-2">{notice.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-3">
                        {notice.summary}
                    </p>
                    <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {notice.reactions.check}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {notice.reactions.heart}
                        </span>
                        <span className="flex items-center gap-1">
                          <Smile className="w-3 h-3" />
                          {notice.reactions.smile}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">조회 {notice.viewCount}</span>
                    </div>
                </div>
              </Link>
            ))}
          </div>
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
