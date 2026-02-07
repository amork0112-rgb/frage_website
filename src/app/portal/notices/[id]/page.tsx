"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import { ChevronLeft, Calendar, Eye, CheckCircle2, Heart, Smile, FileText, Download, ImageIcon, Paperclip } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NoticeDetailPage() {
  const params = useParams();
  const noticeId = params.id as string;
  const [serverNotice, setServerNotice] = useState<any | null>(null);

  // Reactions state
  const [reactions, setReactions] = useState({ check: 0, heart: 0, smile: 0 });
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [isLoadingReaction, setIsLoadingReaction] = useState(false);

  useEffect(() => {
    (async () => {
      const numId = Number(noticeId);
      if (Number.isNaN(numId)) return;

      // 1. Increment View Count (once per session locally)
      // Check localStorage to avoid duplicate increments
      const storageKey = `viewed_notice_${numId}`;
      if (typeof window !== 'undefined' && !localStorage.getItem(storageKey)) {
        try {
          await fetch(`/api/notices/${numId}/view`);
          localStorage.setItem(storageKey, "true");
        } catch (e) {
          console.error("View increment failed", e);
        }
      }

      // 2. Fetch Notice Details
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("id", numId)
        .eq("category", "notice")
        .single();

      if (data) {
        setServerNotice({
          id: String(data.id),
          title: data.title,
          date: data.created_at,
          category: data.category || "Academic",
          campus: "All",
          summary: data.content || "",
          content: String(data.content || "").split(/\n+/),
          isPinned: !!data.is_pinned,
          isArchived: !!data.is_archived,
          viewCount: data.view_count || 0,
          attachmentUrl: data.attachment_url,
          attachmentType: data.attachment_type,
        });
      } else {
        setServerNotice(null);
      }
    })();
  }, [noticeId]);

  // 3. Fetch Initial Reactions
  useEffect(() => {
    (async () => {
      if (!noticeId) return;
      try {
        const res = await fetch(`/api/notices/${noticeId}/reactions`);
        const json = await res.json();
        if (json.ok) {
          setReactions(json.counts);
          setMyReactions(json.myReactions || []);
        }
      } catch (e) {
        console.error("Fetch reactions failed", e);
      }
    })();
  }, [noticeId]);

  const notice = serverNotice;

  const handleReaction = async (type: 'check' | 'heart' | 'smile') => {
    if (isLoadingReaction) return;

    // Optimistic Update
    const isActive = myReactions.includes(type);
    const nextMyReactions = isActive 
      ? myReactions.filter(r => r !== type) 
      : [...myReactions, type];

    const nextReactions = { ...reactions };
    if (isActive) {
      nextReactions[type] = Math.max(0, nextReactions[type] - 1);
    } else {
      nextReactions[type] = nextReactions[type] + 1;
    }

    setMyReactions(nextMyReactions);
    setReactions(nextReactions);
    setIsLoadingReaction(true);

    try {
      const res = await fetch(`/api/notices/${noticeId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionType: type }),
      });
      const json = await res.json();

      if (!json.ok) {
        // Revert or show error
        if (json.error === "Unauthorized") {
          alert("로그인이 필요합니다.");
        } else {
          // Silent fail or toast? Just revert for now by refetching
        }
        // Refetch to sync state
        const refresh = await fetch(`/api/notices/${noticeId}/reactions`);
        const rJson = await refresh.json();
        if (rJson.ok) {
          setReactions(rJson.counts);
          setMyReactions(rJson.myReactions || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingReaction(false);
    }
  };

  if (!notice) {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <PortalHeader />
            <main className="px-4 py-20 max-w-2xl mx-auto text-center">
                <h1 className="text-xl font-bold text-slate-800">공지사항을 찾을 수 없습니다</h1>
                <Link href="/portal/notices" className="text-frage-blue hover:underline mt-4 block">
                    목록으로 돌아가기
                </Link>
            </main>
        </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      
      <main className="px-4 py-6 max-w-2xl mx-auto">
        
        {/* Back Button */}
        <Link href="/portal/notices" className="inline-flex items-center text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors">
            <ChevronLeft className="w-5 h-5 mr-1" />
            목록으로
        </Link>

        <article className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                        (notice?.category) === 'Schedule' ? 'bg-orange-50 text-frage-orange border-orange-100' :
                        (notice?.category) === 'Academic' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        (notice?.category) === 'Event' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                        {notice?.category}
                    </span>
                    {serverNotice?.isPinned && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-red-50 text-red-600 border-red-100 uppercase tracking-wider">
                            중요
                        </span>
                    )}
                </div>
                
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 leading-tight">
                    {notice?.title}
                </h1>
                
                <div className="flex items-center justify-between text-sm font-medium text-slate-500">
                    <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(notice?.date || '')}
                    </div>
                    <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{notice?.viewCount || 0}</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8">
                {notice && (
                  <div className="prose prose-slate max-w-none">
                    {(notice.content || []).map((paragraph: string, index: number) => (
                      <p key={index} className="mb-4 text-slate-700 leading-relaxed last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}

                {/* Attachment Section */}
                {notice?.attachmentUrl && (
                  <div className="mt-8 mb-8">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between group hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                         <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 shrink-0">
                           {notice.attachmentType === 'pdf' ? (
                             <FileText className="w-6 h-6 text-red-500" />
                           ) : notice.attachmentType === 'image' ? (
                             <ImageIcon className="w-6 h-6 text-blue-500" />
                           ) : (
                             <Paperclip className="w-6 h-6 text-slate-400" />
                           )}
                         </div>
                         
                         <div className="flex flex-col min-w-0">
                           <span className="text-sm font-bold text-slate-700 truncate max-w-[150px] sm:max-w-xs">
                             {/* Attempt to show filename, fallback to '첨부파일' */}
                             {(() => {
                               try {
                                 const filename = decodeURIComponent(notice.attachmentUrl.split('/').pop()?.split('?')[0] || '');
                                 return filename || '첨부파일';
                               } catch {
                                 return '첨부파일';
                               }
                             })()}
                           </span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                             {notice.attachmentType || 'FILE'}
                           </span>
                         </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                         {/* Preview Button (PDF only) */}
                         {notice.attachmentType === 'pdf' && (
                           <a 
                             href={notice.attachmentUrl} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
                           >
                             <Eye className="w-3.5 h-3.5" />
                             <span className="hidden sm:inline">미리보기</span>
                           </a>
                         )}

                         {/* Download Button */}
                         <a 
                           href={notice.attachmentUrl}
                           download
                           target="_blank"
                           className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                           title="다운로드"
                         >
                           <Download className="w-5 h-5" />
                         </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reaction Section */}
                <div className="mt-12 pt-8 border-t border-slate-100">
                    <h4 className="text-center text-sm font-bold text-slate-400 mb-4">이 공지사항에 대해 어떻게 생각하시나요?</h4>
                    <div className="flex justify-center gap-4">
                        <button 
                            onClick={() => handleReaction('check')}
                            disabled={isLoadingReaction}
                            className={`flex flex-col items-center gap-2 p-3 min-w-[80px] rounded-xl transition-all ${
                                myReactions.includes('check')
                                ? 'bg-green-50 text-green-600 scale-105 ring-2 ring-green-100' 
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            } ${isLoadingReaction ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <CheckCircle2 className={`w-8 h-8 ${myReactions.includes('check') ? 'fill-current' : ''}`} />
                            <span className="text-xs font-bold">확인했어요</span>
                            <span className="text-xs font-medium bg-white/50 px-2 rounded-full">{reactions.check}</span>
                        </button>

                        <button 
                            onClick={() => handleReaction('heart')}
                            disabled={isLoadingReaction}
                            className={`flex flex-col items-center gap-2 p-3 min-w-[80px] rounded-xl transition-all ${
                                myReactions.includes('heart')
                                ? 'bg-red-50 text-red-500 scale-105 ring-2 ring-red-100' 
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            } ${isLoadingReaction ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Heart className={`w-8 h-8 ${myReactions.includes('heart') ? 'fill-current' : ''}`} />
                            <span className="text-xs font-bold">좋아요</span>
                            <span className="text-xs font-medium bg-white/50 px-2 rounded-full">{reactions.heart}</span>
                        </button>

                        <button 
                            onClick={() => handleReaction('smile')}
                            disabled={isLoadingReaction}
                            className={`flex flex-col items-center gap-2 p-3 min-w-[80px] rounded-xl transition-all ${
                                myReactions.includes('smile')
                                ? 'bg-yellow-50 text-yellow-600 scale-105 ring-2 ring-yellow-100' 
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            } ${isLoadingReaction ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Smile className={`w-8 h-8 ${myReactions.includes('smile') ? 'fill-current' : ''}`} />
                            <span className="text-xs font-bold">감사합니다</span>
                            <span className="text-xs font-medium bg-white/50 px-2 rounded-full">{reactions.smile}</span>
                        </button>
                    </div>
                </div>
            </div>
            
        </article>

      </main>
    </div>
  );
}
