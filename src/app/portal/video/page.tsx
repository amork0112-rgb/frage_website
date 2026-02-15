//app/portal/video/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import PortalHeader from "@/components/PortalHeader";
import Link from "next/link";
import { PlayCircle, CheckCircle, Clock, ChevronRight, Video, ChevronDown, ChevronUp, Star, MessageSquare } from "lucide-react";

type VideoHomeworkItem = {
  id: string;
  title: string;
  module: string;
  dueDate: string;
  status: "Pending" | "Submitted" | "Reviewed";
  isToday?: boolean;
  score: string | null;
  feedback: {
    overall_message: string;
    strengths: string[];
    focus_point: string;
    next_try_guide: string;
    details: {
      fluency_score: string;
      volume_score: string;
      speed_score: string;
      pronunciation_score: string;
      performance_score: string;
    };
  } | null;
};

export default function VideoListPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [homeworkList, setHomeworkList] = useState<Array<VideoHomeworkItem>>([]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const mapScore = (n: number, type: "fluency" | "volume" | "speed" | "pronunciation" | "performance") => {
    if (type === "volume") return n >= 4 ? "Strong" : n === 3 ? "Clear" : n === 2 ? "Developing" : "Needs Support";
    if (type === "speed") return n >= 4 ? "Natural" : n === 3 ? "Appropriate" : n === 2 ? "Developing" : "Too Slow";
    if (type === "pronunciation") return n >= 4 ? "Consistently Precise" : n === 3 ? "Mostly Accurate" : n === 2 ? "Developing" : "Needs Support";
    if (type === "performance") return n >= 4 ? "Engaging" : n === 3 ? "Focused" : n === 2 ? "Developing" : "Needs Support";
    return n >= 4 ? "Excellent" : n === 3 ? "Appropriate" : n === 2 ? "Developing" : "Needs Support";
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/portal/video`);
        const data = await res.json();
        const list = Array.isArray(data?.items) ? data.items : [];
        const mapped = list.map((item: any) => ({
          id: String(item.id),
          title: String(item.title || ""),
          module: String(item.module || ""),
          dueDate: String(item.dueDate || ""),
          status: item.status === "Submitted" ? "Submitted" : item.status === "Reviewed" ? "Reviewed" : "Pending",
          isToday: String(item.dueDate || "") === todayStr,
          score: item.score ? String(item.score) : null,
          feedback: item.feedback || null
        }));
        setHomeworkList(mapped);
      } catch (e) {
        console.error("Failed to fetch homework list:", e);
        setHomeworkList([]);
      }
    })();
  }, [todayStr]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      
      <main className="px-4 md:px-6 py-8 max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Video className="w-6 h-6 text-frage-blue" />
              영상 과제 (Video Homework)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              매일 읽기 연습을 영상으로 기록하고 피드백을 받아보세요.
            </p>
          </div>
        </header>

        {/* 1. Pending Homework (To-Do) */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            할 일 (To Do)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homeworkList.filter(hw => hw.status === "Pending").map((hw) => (
              <Link 
                key={hw.id} 
                href={`/portal/video/${hw.id}`}
                className="flex flex-col h-full bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-frage-blue hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Video className="w-24 h-24 text-frage-blue transform rotate-12" />
                </div>
                
                <div className="relative z-10 flex-1">
                    <div className="flex items-start justify-between mb-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                            hw.isToday 
                            ? "bg-red-50 text-red-600 border-red-100" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                            {hw.isToday ? "오늘 마감" : `Due: ${hw.dueDate}`}
                        </span>
                    </div>
                    
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-frage-blue transition-colors mb-2 line-clamp-2">
                        {hw.title}
                    </h3>
                    <p className="text-slate-500 font-medium text-sm">
                        {hw.module}
                    </p>
                </div>

                <div className="relative z-10 mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                   <span className="text-sm font-bold text-frage-blue flex items-center gap-2">
                       <PlayCircle className="w-5 h-5" />
                       녹화하기
                   </span>
                   <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-frage-blue group-hover:text-white transition-colors">
                       <ChevronRight className="w-4 h-4" />
                   </div>
                </div>
              </Link>
            ))}
            
            {homeworkList.filter(hw => hw.status === "Pending").length === 0 && (
              <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">모든 과제를 완료했습니다!</h3>
                <p className="text-slate-500 text-sm mt-1">새로운 과제가 등록될 때까지 기다려주세요.</p>
              </div>
            )}
          </div>
        </section>

        {/* 2. Past Homework (History) with Toggle Feedback */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 mt-8 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-slate-300"></span>
             지난 과제 (History)
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {homeworkList.filter(hw => hw.status !== "Pending").map((hw) => (
               <div key={hw.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${expandedId === hw.id ? "border-frage-blue ring-1 ring-frage-blue/10" : "border-slate-200"}`}>
                 {/* Header Row (Click to Toggle) */}
                 <button 
                   onClick={() => toggleExpand(hw.id)}
                   className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left rounded-2xl"
                 >
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                        hw.status === "Reviewed" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                      }`}>
                         {hw.status === "Reviewed" ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                         <h3 className="font-bold text-slate-800 text-base mb-1">{hw.title}</h3>
                         <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="bg-slate-100 px-2 py-0.5 rounded">{hw.module}</span>
                            <span>{hw.dueDate}</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                          {hw.status === "Reviewed" ? (
                            <span className="text-base font-black text-frage-navy">{hw.score}</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">제출됨</span>
                          )}
                      </div>
                      {expandedId === hw.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                   </div>
                 </button>
                 
                 {/* Feedback Content (Toggled) */}
                 {expandedId === hw.id && (
                   <div className="border-t border-slate-100 bg-slate-50/50 p-6 rounded-b-2xl animate-fade-in">
                     {hw.status === "Reviewed" && hw.feedback ? (
                       <div className="space-y-5">
                         {/* [1] Overall Message */}
                         <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                           <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-frage-blue" />
                            <span className="text-xs font-bold text-slate-500">Teacher Feedback</span>
                          </div>
                          <p className="text-lg font-bold text-frage-navy leading-relaxed">
                            {hw.feedback.overall_message}
                          </p>
                         </div>

                         {/* [2] Strength */}
                         <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                           <h4 className="font-bold text-green-700 text-xs mb-2 flex items-center gap-1">
                             <Star className="w-3 h-3 fill-current" /> Strength Highlight
                           </h4>
                           <ul className="space-y-1">
                             {hw.feedback.strengths.map((str, i) => (
                               <li key={i} className="text-sm font-medium text-green-800 flex items-start gap-2">
                                 <span className="mt-1.5 w-1 h-1 rounded-full bg-green-500 flex-shrink-0"></span>
                                 {str}
                               </li>
                             ))}
                           </ul>
                         </div>

                         {/* [3] Focus Point */}
                         <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                           <h4 className="font-bold text-orange-700 text-xs mb-1">💡 One Focus Point</h4>
                           <p className="text-sm font-medium text-orange-800">{hw.feedback.focus_point}</p>
                         </div>

                         {/* [4] Next Try */}
                         <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                           <h4 className="font-bold text-blue-700 text-xs mb-1">🚀 Next Try Guide</h4>
                           <p className="text-sm font-medium text-blue-800">{hw.feedback.next_try_guide}</p>
                         </div>

                         {/* [5] Details (Table) */}
                         <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                           <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                             <span className="text-xs font-bold text-slate-500 uppercase">Reading Details</span>
                           </div>
                           <div className="divide-y divide-slate-50">
                             {Object.entries(hw.feedback.details).map(([key, value]) => (
                               <div key={key} className="px-4 py-2 flex justify-between items-center text-sm">
                                 <span className="text-slate-600">{key}</span>
                                 <span className="font-bold text-frage-blue">{value}</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       </div>
                     ) : (
                       <div className="text-center py-4">
                         <p className="text-slate-500 text-sm">
                           아직 선생님의 피드백이 등록되지 않았습니다.<br/>
                           조금만 기다려주세요!
                         </p>
                       </div>
                     )}
                   </div>
                 )}
               </div>
             ))}
          </div>
        </section>

      </main>
    </div>
  );
}
