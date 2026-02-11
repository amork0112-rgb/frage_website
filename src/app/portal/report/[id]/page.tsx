"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import { 
  FileText, CheckCircle, BarChart3, MessageSquare, 
  Mic, Video, PenTool, Sparkles, ChevronLeft, Calendar, User, School 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { classGoals } from "@/data/classGoals";

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 1. Get the report by ID
        // Note: The original page used month and studentId to fetch.
        // We need to fetch the specific report metadata first.
        const { data: reportMeta } = await supabase
          .from("published_reports")
          .select("*")
          .eq("id", reportId)
          .single();

        if (reportMeta) {
          // 2. Fetch the detailed content using the same API as before
          const res = await fetch(`/api/teacher/reports?studentId=${reportMeta.student_id}&month=${encodeURIComponent(reportMeta.month)}`);
          const data = await res.json();
          setReport({
            ...data?.item,
            month: reportMeta.month,
            studentId: reportMeta.student_id
          });
        }
      } catch (error) {
        console.error("Error fetching report detail:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Loading...</div>;
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
      
      <main className="px-4 md:px-6 py-6 max-w-5xl mx-auto space-y-6">
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center text-slate-500 hover:text-slate-800 font-bold transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          목록으로
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header Section */}
          <div className="bg-slate-50 border-b border-slate-200 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Monthly Report</h2>
                <p className="text-slate-500 font-medium">학습 성취도 및 선생님 피드백을 확인하세요.</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm text-center min-w-[100px]">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Month</div>
                  <div className="text-slate-900 font-bold">{report.month}</div>
                </div>
                <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm text-center min-w-[100px]">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Class</div>
                  <div className="text-slate-900 font-bold">{report.className || "-"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Class Goal & Learning Focus */}
          <div className="p-6 md:p-8 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-frage-orange">
                    <CheckCircle className="w-4 h-4" />
                </span>
                Class Goal & Learning Focus
            </h3>
            {(() => {
              const goal = report.className ? classGoals[report.className] : null;
              if (!goal) {
                 return (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-500 text-sm italic">
                        Class goals are not available for this class yet.
                    </div>
                 );
              }
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-3 text-red-600 font-bold">
                            <FileText className="w-5 h-5" /> Reading
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{goal.Reading}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-3 text-blue-600 font-bold">
                            <Mic className="w-5 h-5" /> Listening
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{goal.Listening}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-3 text-green-600 font-bold">
                            <MessageSquare className="w-5 h-5" /> Speaking
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{goal.Speaking}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-3 text-purple-600 font-bold">
                            <PenTool className="w-5 h-5" /> Writing
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{goal.Writing}</p>
                    </div>
                </div>
              );
            })()}
          </div>

          {/* Teacher's Feedback */}
          <div className="p-6 md:p-8 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600">
                    <MessageSquare className="w-4 h-4" />
                </span>
                Teacher&apos;s Feedback
            </h3>
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                <p className="text-slate-700 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                    {report.overall || "리포트 데이터가 없습니다."}
                </p>
            </div>
          </div>

          {/* Video Rubric */}
          <div className="p-6 md:p-8 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600">
                    <BarChart3 className="w-4 h-4" />
                </span>
                Video Rubric
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm text-left border-collapse min-w-[500px]">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                            <th className="p-4 border-b border-slate-200 w-40 font-bold">Category</th>
                            <th className="p-4 border-b border-slate-200 font-bold">Score</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {["fluency","volume","speed","pronunciation","performance"].map((k) => {
                          const v = report.videoScores?.[k] ?? 0;
                          const label = k.charAt(0).toUpperCase() + k.slice(1);
                          return (
                            <tr key={k} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-bold text-slate-700 border-r border-slate-100">{label}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-4">
                                  <div className="flex gap-1.5">
                                    {[1,2,3,4].map((star) => (
                                      <div
                                        key={star}
                                        className={`h-2.5 rounded-full transition-all duration-500 ${star <= v ? "w-10 bg-gradient-to-r from-yellow-400 to-orange-500 shadow-sm" : "w-2.5 bg-slate-100"}`}
                                      ></div>
                                    ))}
                                  </div>
                                  <span className="text-sm font-bold text-frage-orange bg-orange-50 px-3 py-0.5 rounded-full border border-orange-100">{v}/4</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                </table>
            </div>
          </div>

          {/* Teacher's Video Feedback */}
          <div className="p-6 md:p-8 border-b border-slate-100">
             <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                 <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-100 text-pink-600">
                     <Video className="w-4 h-4" />
                 </span>
                 Teacher&apos;s Video Feedback
             </h3>
             <div className="bg-pink-50/50 p-6 rounded-2xl border border-pink-100">
                 <p className="text-slate-700 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                     {report.videoSummary || "비디오 피드백이 없습니다."}
                 </p>
             </div>
          </div>

          {/* Class Participation & Skill Progress */}
          <div className="p-6 md:p-8">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                </span>
                Class Participation & Skill Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3 text-red-600 font-bold border-b border-slate-100 pb-2">
                        <FileText className="w-5 h-5" /> Reading
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed min-h-[60px] whitespace-pre-wrap">{report.comments?.Reading || "-"}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3 text-blue-600 font-bold border-b border-slate-100 pb-2">
                        <Mic className="w-5 h-5" /> Listening
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed min-h-[60px] whitespace-pre-wrap">{report.comments?.Listening || "-"}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3 text-green-600 font-bold border-b border-slate-100 pb-2">
                        <MessageSquare className="w-5 h-5" /> Speaking
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed min-h-[60px] whitespace-pre-wrap">{report.comments?.Speaking || "-"}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3 text-purple-600 font-bold border-b border-slate-100 pb-2">
                        <PenTool className="w-5 h-5" /> Writing
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed min-h-[60px] whitespace-pre-wrap">{report.comments?.Writing || "-"}</p>
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
