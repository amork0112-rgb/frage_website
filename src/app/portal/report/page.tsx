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
      
      <main className="px-4 py-6 max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
           <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <FileText className="w-6 h-6 text-frage-navy" />
             월간 리포트
           </h1>
           <div className="relative">
             <select 
               className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-frage-blue"
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

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border-t-8 border-frage-orange transform transition-all hover:shadow-2xl duration-300">
            <div className="relative p-8 text-center border-b border-slate-100 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-frage-orange via-yellow-400 to-frage-orange"></div>
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-100 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-50"></div>
                <div className="relative z-10">
                    <div className="flex justify-center items-center gap-2 mb-3">
                        <span className="text-frage-orange font-black text-2xl tracking-widest drop-shadow-sm">FRAGE KINDER</span>
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 mb-8 font-serif tracking-tight">Monthly Report</h2>
                    <div className="inline-flex flex-wrap justify-center items-center gap-4 bg-white px-8 py-4 rounded-full shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-frage-orange" />
                            <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Month</span>
                            <span className="text-slate-900 font-bold text-lg">{monthLabel}</span>
                        </div>
                        <span className="hidden md:block w-px h-8 bg-slate-200"></span>
                        <div className="flex items-center gap-2">
                            <School className="w-5 h-5 text-blue-500" />
                            <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Class</span>
                            <span className="text-slate-900 font-bold text-lg">{report?.className || "-"}</span>
                        </div>
                        <span className="hidden md:block w-px h-8 bg-slate-200"></span>
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-green-500" />
                            <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">ID</span>
                            <span className="text-slate-900 font-bold text-lg">{studentId}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-10 border-b border-slate-100 bg-gradient-to-b from-white to-orange-50/30">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 text-frage-orange">
                        <CheckCircle className="w-6 h-6" />
                    </span>
                    Skill Feedback
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="group bg-white p-5 rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-all hover:border-orange-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600"><FileText className="w-4 h-4" /></div>
                            <span className="font-bold text-slate-800">Reading</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900">{report?.comments?.Reading || "-"}</p>
                    </div>
                    <div className="group bg-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all hover:border-blue-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Mic className="w-4 h-4" /></div>
                            <span className="font-bold text-slate-800">Listening</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900">{report?.comments?.Listening || "-"}</p>
                    </div>
                    <div className="group bg-white p-5 rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-all hover:border-green-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600"><MessageSquare className="w-4 h-4" /></div>
                            <span className="font-bold text-slate-800">Speaking</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900">{report?.comments?.Speaking || "-"}</p>
                    </div>
                    <div className="group bg-white p-5 rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-all hover:border-purple-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><PenTool className="w-4 h-4" /></div>
                            <span className="font-bold text-slate-800">Writing</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900">{report?.comments?.Writing || "-"}</p>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-10 border-b border-slate-100">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600">
                        <BarChart3 className="w-6 h-6" />
                    </span>
                    Video Rubric
                </h3>
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                                <th className="p-4 border-b border-slate-200 w-32 font-bold">Category</th>
                                <th className="p-4 border-b border-slate-200 font-bold">Score</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {["fluency","volume","speed","pronunciation","performance"].map((k) => {
                              const v = report?.videoScores?.[k] ?? 0;
                              const label = k === "fluency" ? "Fluency" : k === "volume" ? "Volume" : k === "speed" ? "Speed" : k === "pronunciation" ? "Pronunciation" : "Performance";
                              return (
                                <tr key={k} className="group hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                  <td className="p-4 font-bold text-slate-700 border-r border-slate-100 group-hover:text-frage-orange transition-colors">{label}</td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-4 mb-2">
                                      <div className="flex gap-1.5">
                                        {[1,2,3,4].map((star) => (
                                          <div
                                            key={star}
                                            className={`h-2 rounded-full transition-all duration-500 ${star <= v ? "w-8 bg-gradient-to-r from-yellow-400 to-orange-500 shadow-sm" : "w-2 bg-slate-100"}`}
                                          ></div>
                                        ))}
                                      </div>
                                      <span className="text-sm font-bold text-frage-orange bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">{v}/4</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-6 md:p-10 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600">
                        <Video className="w-6 h-6" />
                    </span>
                    Teacher&apos;s Feedback
                </h3>
                <div className="flex flex-col gap-6">
                    <div className="flex-[2] bg-blue-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-60"></div>
                        <h4 className="font-bold text-sm text-blue-800 mb-3 flex items-center gap-2 relative z-10">
                            <MessageSquare className="w-4 h-4" />
                            Overall
                        </h4>
                        <p className="text-slate-700 leading-relaxed text-sm relative z-10 bg-white/50 p-4 rounded-xl border border-blue-100/50">
                            {report?.overall || "-"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-10">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 text-purple-600">
                        <School className="w-6 h-6" />
                    </span>
                    Class Participation & Skill Progress
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-5 border-l-4 border-red-400 bg-white shadow-sm rounded-r-xl hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 text-red-500 font-bold mb-2">
                            <FileText className="w-4 h-4" /> Reading
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{report?.comments?.Reading || "-"}</p>
                    </div>
                    <div className="p-5 border-l-4 border-blue-400 bg-white shadow-sm rounded-r-xl hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 text-blue-500 font-bold mb-2">
                            <Mic className="w-4 h-4" /> Listening
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{report?.comments?.Listening || "-"}</p>
                    </div>
                    <div className="p-5 border-l-4 border-green-400 bg-white shadow-sm rounded-r-xl hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 text-green-500 font-bold mb-2">
                            <MessageSquare className="w-4 h-4" /> Speaking
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{report?.comments?.Speaking || "-"}</p>
                    </div>
                    <div className="p-5 border-l-4 border-purple-400 bg-white shadow-sm rounded-r-xl hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 text-purple-500 font-bold mb-2">
                            <PenTool className="w-4 h-4" /> Writing
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{report?.comments?.Writing || "-"}</p>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
