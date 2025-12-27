"use client";

import { useState } from "react";
import PortalHeader from "@/components/PortalHeader";
import Link from "next/link";
import { PlayCircle, CheckCircle, Clock, ChevronRight, Video, ChevronDown, ChevronUp, Star, MessageSquare } from "lucide-react";

export default function VideoListPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Mock Data
  const homeworkList = [
    {
      id: "hw_124",
      title: "Into Reading 1.3",
      module: "[Module 5-2] Day 19",
      dueDate: "2024-09-19",
      status: "Pending", // Pending, Submitted, Reviewed
      isToday: true,
      score: null,
      feedback: null
    },
    {
      id: "hw_123",
      title: "Into Reading 1.3",
      module: "[Module 5-1] Day 18",
      dueDate: "2024-09-18",
      status: "Reviewed",
      score: "Excellent",
      feedback: {
        overall_message: "Clear effort and steady reading today.",
        strengths: ["Clear voice throughout the reading", "Good focus from start to finish"],
        focus_point: "Try to read without pausing mid-sentence.",
        next_try_guide: "Read one page slowly while keeping your eyes on the text.",
        details: {
          Fluency: "Developing",
          Volume: "Clear",
          Speed: "Appropriate",
          Pronunciation: "Mostly Accurate",
          Performance: "Focused"
        }
      }
    },
    {
      id: "hw_122",
      title: "Into Reading 1.2",
      module: "[Module 4-3] Day 15",
      dueDate: "2024-09-15",
      status: "Reviewed",
      score: "Good Job",
      feedback: {
        overall_message: "Good effort on vocabulary. Remember to review the word list.",
        strengths: ["Great memorization of new words."],
        focus_point: "Pronunciation of 'r' needs more practice.",
        next_try_guide: "Practice the vocabulary sentences at home.",
        details: {
          Fluency: "Needs Support",
          Volume: "Clear",
          Speed: "Too Fast",
          Pronunciation: "Developing",
          Performance: "Inconsistent"
        }
      }
    },
    {
      id: "hw_121",
      title: "Into Reading 1.2",
      module: "[Module 4-2] Day 14",
      dueDate: "2024-09-14",
      status: "Submitted",
      score: null,
      feedback: null
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      
      <main className="px-4 py-6 max-w-2xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Video className="w-6 h-6 text-frage-blue" />
            영상 과제 (Video Homework)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            매일 읽기 연습을 영상으로 기록하고 피드백을 받아보세요.
          </p>
        </header>

        {/* 1. Pending Homework (To-Do) */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">
            할 일 (To Do)
          </h2>
          <div className="space-y-3">
            {homeworkList.filter(hw => hw.status === "Pending").map((hw) => (
              <Link 
                key={hw.id} 
                href={`/portal/video/${hw.id}`}
                className="block bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:border-frage-blue hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100">
                      {hw.isToday ? "9월 19일 마감" : `Due: ${hw.dueDate}`}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-frage-blue transition-colors" />
                </div>
                
                <div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-frage-blue transition-colors">
                    {hw.title}
                  </h3>
                  <p className="text-slate-500 font-medium text-sm mt-0.5">
                    {hw.module}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-frage-blue">
                   <PlayCircle className="w-4 h-4" />
                   녹화하러 가기
                </div>
              </Link>
            ))}
            
            {homeworkList.filter(hw => hw.status === "Pending").length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200 border-dashed">
                <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">현재 제출할 과제가 없습니다.</p>
              </div>
            )}
          </div>
        </section>

        {/* 2. Past Homework (History) with Toggle Feedback */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1 mt-8">
             지난 과제 (History)
          </h2>
          <div className="space-y-3">
             {homeworkList.filter(hw => hw.status !== "Pending").map((hw) => (
               <div key={hw.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 {/* Header Row (Click to Toggle) */}
                 <button 
                   onClick={() => toggleExpand(hw.id)}
                   className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                 >
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        hw.status === "Reviewed" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                      }`}>
                         {hw.status === "Reviewed" ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                         <h3 className="font-bold text-slate-800 text-sm">{hw.title}</h3>
                         <p className="text-xs text-slate-500">{hw.module} • {hw.dueDate}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                      <div className="text-right">
                          {hw.status === "Reviewed" ? (
                            <span className="text-sm font-bold text-frage-navy">{hw.score}</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">제출 완료</span>
                          )}
                      </div>
                      {expandedId === hw.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                   </div>
                 </button>
                 
                 {/* Feedback Content (Toggled) */}
                 {expandedId === hw.id && (
                   <div className="border-t border-slate-100 bg-slate-50/50 p-5 animate-fade-in-down">
                     {hw.status === "Reviewed" && hw.feedback ? (
                       <div className="space-y-4">
                         {/* [1] Overall Message */}
                         <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                           <div className="flex items-center gap-2 mb-2">
                             <MessageSquare className="w-4 h-4 text-frage-blue" />
                             <span className="text-xs font-bold text-slate-500">Teacher's Feedback</span>
                           </div>
                           <p className="text-lg font-bold text-frage-navy leading-relaxed">
                             "{hw.feedback.overall_message}"
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