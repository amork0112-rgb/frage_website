"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import { ChevronLeft, Calendar, User, CheckCircle, Clock, Sparkles, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DailyReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("daily_reports")
          .select("*, students(student_name)")
          .eq("id", reportId)
          .single();

        if (error) throw error;
        setReport(data);

        // Mark as read in localStorage
        const readIds = JSON.parse(localStorage.getItem("read_reports") || "[]");
        if (!readIds.includes(reportId)) {
          localStorage.setItem("read_reports", JSON.stringify([...readIds, reportId]));
        }
      } catch (err) {
        console.error("Error fetching daily report:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-frage-blue"></div>
    </div>
  );

  if (!report) return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader />
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-4">리포트를 찾을 수 없습니다.</h2>
        <button onClick={() => router.back()} className="text-frage-blue font-bold flex items-center gap-2 mx-auto">
          <ChevronLeft className="w-4 h-4" /> 뒤로 가기
        </button>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      
      <main className="px-4 md:px-6 py-6 max-w-2xl mx-auto space-y-6">
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center text-slate-500 hover:text-slate-800 font-bold transition-colors mb-2"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          뒤로 가기
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-frage-navy to-slate-800 p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </div>
              <h1 className="text-xl font-bold">오늘의 다짐 리포트</h1>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm">
                <User className="w-4 h-4 opacity-70" />
                <span className="font-medium">{report.students?.student_name} 학생</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm">
                <Calendar className="w-4 h-4 opacity-70" />
                <span className="font-medium">
                  {new Date(report.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Completion Status */}
            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-sm text-slate-500 font-bold mb-1">다짐 활동 성취도</p>
                <h3 className="text-2xl font-black text-slate-900">
                  {report.completion_rate === 100 ? (
                    <span className="text-green-600">All Completed! 💚</span>
                  ) : (
                    <span className="text-orange-500">{report.completion_rate}% 완료</span>
                  )}
                </h3>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-slate-200 flex items-center justify-center relative">
                <div 
                  className="absolute inset-0 rounded-full border-4 border-green-500" 
                  style={{ 
                    clipPath: `inset(${100 - report.completion_rate}% 0 0 0)`,
                    transition: 'clip-path 1s ease-out'
                  }}
                ></div>
                <span className="text-sm font-bold text-slate-700">{report.completion_rate}%</span>
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-frage-blue" />
                선생님 브리핑
              </h3>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 min-h-[200px]">
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
                  {report.message_text}
                </div>
              </div>
            </div>

            <div className="pt-4 text-center">
              <p className="text-sm text-slate-400 font-medium">
                가정에서의 따뜻한 격려와 지도 부탁드립니다. 감사합니다.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
