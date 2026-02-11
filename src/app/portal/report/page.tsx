"use client";

import { useEffect, useMemo, useState } from "react";
import PortalHeader from "@/components/PortalHeader";
import { FileText, Calendar, User, School, CheckCircle, BarChart3, MessageSquare, ChevronDown, Mic, Video, PenTool } from "lucide-react";
import { supabase } from "@/lib/supabase";

type PublishedSummary = { id: string; title: string; date: string; month: string };

export default function ReportPage() {
  const [studentId, setStudentId] = useState<string>("");
  const [list, setList] = useState<PublishedSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || "";
      if (!uid) return;
      const { data: parents } = await supabase
        .from("parents")
        .select("*")
        .eq("auth_user_id", uid)
        .limit(1);
      const parent = Array.isArray(parents) && parents.length > 0 ? parents[0] : null;
      if (!parent) return;
      const { data: students } = await supabase
        .from("students")
        .select("*")
        .eq("parent_account_id", parent.id)
        .limit(1);
      const child = Array.isArray(students) && students.length > 0 ? students[0] : null;
      const sid = child ? String(child.id) : "";
      if (sid) setStudentId(sid);
    })();
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        if (!studentId) return;
        const res = await fetch(`/api/portal/reports?studentId=${studentId}`);
        const data = await res.json();
        const items: PublishedSummary[] = (data?.items || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          date: r.date,
          month: r.month
        }));
        if (alive) {
          setList(items);
          if (!selectedMonth && items.length > 0) setSelectedMonth(items[0].month);
        }
      } catch {}
    };
    load();
    return () => {
      alive = false;
    };
  }, [studentId, selectedMonth]);

  useEffect(() => {
    let alive = true;
    const loadDetail = async () => {
      if (!selectedMonth) {
        setReport(null);
        return;
      }
      try {
        const res = await fetch(`/api/teacher/reports?studentId=${studentId}&month=${encodeURIComponent(selectedMonth)}`);
        const data = await res.json();
        if (alive) setReport(data?.item || null);
      } catch {
        if (alive) setReport(null);
      }
    };
    loadDetail();
    return () => {
      alive = false;
    };
  }, [selectedMonth, studentId]);

  const monthLabel = useMemo(() => {
    const m = selectedMonth || "";
    if (!m) return "-";
    const parts = m.split(" ");
    return parts[0] || m;
  }, [selectedMonth]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      
      <main className="px-4 md:px-6 py-6 max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
           <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <FileText className="w-6 h-6 text-frage-navy" />
             월간 리포트
           </h1>
           <div className="relative">
             <select 
               className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-frage-blue cursor-pointer"
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
             >
               {list.map(item => (
                 <option key={item.id} value={item.month}>{item.month}</option>
               ))}
             </select>
             <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
           </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header Section */}
          <div className="bg-slate-50 border-b border-slate-200 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Monthly Report</h2>
                <p className="text-slate-500 font-medium">학습 성취도 및 선생님 피드백을 확인하세요.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Month</div>
                  <div className="text-slate-900 font-bold">{monthLabel}</div>
                </div>
                <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Class</div>
                  <div className="text-slate-900 font-bold">{report?.className || "-"}</div>
                </div>
                <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Student</div>
                  <div className="text-slate-900 font-bold">{studentId}</div>
                </div>
              </div>
            </div>
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
                <p className="text-slate-700 leading-relaxed text-sm md:text-base">
                    {report?.overall || "리포트 데이터가 없습니다."}
                </p>
            </div>
          </div>

          {/* Learning Focus Grid */}
          <div className="p-6 md:p-8 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-frage-orange">
                    <CheckCircle className="w-4 h-4" />
                </span>
                Class Goal & Learning Focus
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-3 text-red-600 font-bold">
                        <FileText className="w-5 h-5" /> Reading
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{report?.comments?.Reading || "-"}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-3 text-blue-600 font-bold">
                        <Mic className="w-5 h-5" /> Listening
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{report?.comments?.Listening || "-"}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-3 text-green-600 font-bold">
                        <MessageSquare className="w-5 h-5" /> Speaking
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{report?.comments?.Speaking || "-"}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-3 text-purple-600 font-bold">
                        <PenTool className="w-5 h-5" /> Writing
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{report?.comments?.Writing || "-"}</p>
                </div>
            </div>
          </div>

          {/* Video Rubric */}
          <div className="p-6 md:p-8">
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
                          const v = report?.videoScores?.[k] ?? 0;
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
        </div>
      </main>
    </div>
  );
}
