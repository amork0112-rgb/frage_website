"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { PlayCircle, CheckCircle, Camera, MessageSquare, ChevronDown, ChevronUp, FileText, Download, Calendar } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";

export default function ParentPortalHome() {
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("2026-01-02");
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [monthlyReports, setMonthlyReports] = useState<{ id: string; title: string; date: string; status: string }[]>([]);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string>(() => {
    try {
      const v = localStorage.getItem("portal_student_id");
      return v || "s8";
    } catch {
      return "s8";
    }
  });

  const toggleFeedback = (id: number) => {
    if (expandedFeedbackId === id) {
      setExpandedFeedbackId(null);
    } else {
      setExpandedFeedbackId(id);
    }
  };

  // Mock Data for "John Doe" (Simulating user 's1')
  const studentData = {
    feedbackHistory: [
      {
        id: 1,
        date: "2024.05.20",
        isNew: true,
        overall: "Excellent reading today! You read with great confidence.",
        score: 4.8,
        strength: "Your volume was clear and steady throughout the passage.",
        focusPoint: "Pay attention to the 'th' sound in words like 'think' and 'that'.",
        nextTry: "Try to pause slightly longer at periods for better rhythm."
      },
      {
        id: 2,
        date: "2024.05.18",
        isNew: false,
        overall: "Good effort on vocabulary. Remember to review the word list.",
        score: 4.5,
        strength: "Great memorization of new words.",
        focusPoint: "Pronunciation of 'r' needs more practice.",
        nextTry: "Practice the vocabulary sentences at home."
      }
    ],
    monthlyReports: []
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/portal/reports?studentId=${studentId}`);
        const data = await res.json();
        if (alive) {
          const items = (data?.items || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            date: r.date,
            status: r.status
          }));
          setMonthlyReports(items);
        }
      } catch {}
      try {
        const res = await fetch(`/api/portal/notifications?studentId=${studentId}`);
        const data = await res.json();
        const first = (data?.items || [])[0];
        if (alive) {
          setPushMessage(first?.message || null);
        }
      } catch {}
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [studentId]);

  // Date formatter
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const formatShortDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const handleDateClick = () => {
    dateInputRef.current?.showPicker();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />

      <main className="px-4 py-6 max-w-2xl mx-auto space-y-8">
        {pushMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-3 py-2 rounded-lg">
            {pushMessage}
          </div>
        )}
        
        {/* 학습세션 섹션 제거됨 */}

        {/* 2. Today's Video Homework */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-frage-blue" />
              오늘의 영상 과제
            </h2>
            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                {formatShortDate(selectedDate)} 마감
            </span>
          </div>
          
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Into Reading 1.3</h3>
                <p className="text-slate-500 font-medium text-sm">[Module 5-1] Day 18</p>
              </div>
            </div>
            
            <Link 
              href="/portal/video/123" 
              className="block w-full py-3 bg-frage-blue text-white font-bold text-center rounded-lg hover:bg-frage-navy transition-colors shadow-md active:scale-[0.98]"
            >
              영상 녹화 / 보기
            </Link>
          </div>
        </section>

        {/* 3. Teacher Feedback History */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-frage-blue" />
            선생님 피드백 (Teacher's Feedback)
          </h2>
          
          <div className="space-y-3">
            {studentData.feedbackHistory.map((feedback) => (
              <div key={feedback.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <button 
                  onClick={() => toggleFeedback(feedback.id)}
                  className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left ${feedback.isNew ? "bg-blue-50/50" : "bg-white"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${feedback.isNew ? "bg-red-500" : "bg-slate-300"}`}></div>
                    <div>
                      <h3 className="text-sm font-bold text-frage-navy">
                        {feedback.date} Feedback
                        {feedback.isNew && <span className="ml-2 text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">NEW</span>}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{feedback.overall}</p>
                    </div>
                  </div>
                  {expandedFeedbackId === feedback.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                
                {expandedFeedbackId === feedback.id && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50/30 animate-fade-in-down">
                    <p className="text-slate-800 font-medium mb-4 leading-relaxed font-serif italic text-lg text-center text-frage-blue">
                      "{feedback.overall}"
                    </p>

                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-blue-600 uppercase block mb-2 tracking-wider">Strength</span>
                        <p className="text-sm text-slate-700">{feedback.strength}</p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-orange-600 uppercase block mb-2 tracking-wider">Focus Point</span>
                        <p className="text-sm text-slate-700">{feedback.focusPoint}</p>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-green-600 uppercase block mb-2 tracking-wider">Next Try</span>
                        <p className="text-sm text-slate-700">{feedback.nextTry}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 4. Monthly Reports */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-frage-navy" />
            월간 리포트 (Monthly Report)
          </h2>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
            {(monthlyReports.length > 0 ? monthlyReports : []).map((report) => (
              <Link key={report.id} href="/portal/report" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-frage-navy group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{report.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{report.date}</p>
                  </div>
                </div>
              </Link>
            ))}
            {monthlyReports.length === 0 && (
              <div className="p-4 text-sm text-slate-500">아직 발행된 월간 리포트가 없습니다.</div>
            )}
          </div>
        </section>


      </main>
    </div>
  );
}
