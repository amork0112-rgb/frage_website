"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import { ChevronLeft, Calendar, Eye, CheckCircle2, Heart, Smile } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NoticeDetailPage() {
  const params = useParams();
  const noticeId = params.id as string;
  const [serverNotice, setServerNotice] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const numId = Number(noticeId);
      if (Number.isNaN(numId)) return;
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
          category: "Academic",
          campus: "All",
          summary: data.content || "",
          content: String(data.content || "").split(/\n+/),
          isPinned: !!data.is_pinned,
          isArchived: !!data.is_archived,
          viewCount: 0,
        });
      } else {
        setServerNotice(null);
      }
    })();
  }, [noticeId]);

  const notice = serverNotice;

  // Local state for reactions to simulate interaction
  const [reactions, setReactions] = useState(
    { check: 0, heart: 0, smile: 0 }
  );
  const [userReaction, setUserReaction] = useState<string | null>(null);

  const handleReaction = (type: 'check' | 'heart' | 'smile') => {
    if (userReaction === type) {
      // Toggle off
        setReactions(prev => ({ ...prev, [type]: prev[type] - 1 }));
        setUserReaction(null);
    } else {
        // Toggle on (and remove previous if any)
        setReactions(prev => ({
            ...prev,
            [type]: prev[type] + 1,
            ...(userReaction ? { [userReaction]: prev[userReaction as 'check' | 'heart' | 'smile'] - 1 } : {})
        }));
        setUserReaction(type);
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

                {/* Reaction Section */}
                <div className="mt-12 pt-8 border-t border-slate-100">
                    <h4 className="text-center text-sm font-bold text-slate-400 mb-4">이 공지사항에 대해 어떻게 생각하시나요?</h4>
                    <div className="flex justify-center gap-4">
                        <button 
                            onClick={() => handleReaction('check')}
                            className={`flex flex-col items-center gap-2 p-3 min-w-[80px] rounded-xl transition-all ${
                                userReaction === 'check' 
                                ? 'bg-green-50 text-green-600 scale-105 ring-2 ring-green-100' 
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                        >
                            <CheckCircle2 className={`w-8 h-8 ${userReaction === 'check' ? 'fill-current' : ''}`} />
                            <span className="text-xs font-bold">확인했어요</span>
                            <span className="text-xs font-medium bg-white/50 px-2 rounded-full">{reactions.check}</span>
                        </button>

                        <button 
                            onClick={() => handleReaction('heart')}
                            className={`flex flex-col items-center gap-2 p-3 min-w-[80px] rounded-xl transition-all ${
                                userReaction === 'heart' 
                                ? 'bg-red-50 text-red-500 scale-105 ring-2 ring-red-100' 
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                        >
                            <Heart className={`w-8 h-8 ${userReaction === 'heart' ? 'fill-current' : ''}`} />
                            <span className="text-xs font-bold">좋아요</span>
                            <span className="text-xs font-medium bg-white/50 px-2 rounded-full">{reactions.heart}</span>
                        </button>

                        <button 
                            onClick={() => handleReaction('smile')}
                            className={`flex flex-col items-center gap-2 p-3 min-w-[80px] rounded-xl transition-all ${
                                userReaction === 'smile' 
                                ? 'bg-yellow-50 text-yellow-600 scale-105 ring-2 ring-yellow-100' 
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                        >
                            <Smile className={`w-8 h-8 ${userReaction === 'smile' ? 'fill-current' : ''}`} />
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
