"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PortalHeader from "@/components/PortalHeader";
import { FileText, ChevronRight, Calendar, User, School, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

type PublishedSummary = { 
  id: string; 
  title: string; 
  date: string; 
  month: string;
  className?: string;
  studentName?: string;
};

export default function ReportListPage() {
  const [studentId, setStudentId] = useState<string>("");
  const [list, setList] = useState<PublishedSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id || "";
        if (!uid) return;

        // 1. Get Parent Info
        const { data: parents } = await supabase
          .from("parents")
          .select("id")
          .eq("auth_user_id", uid)
          .single();

        if (!parents) return;

        // 2. Get Student Info (First child for now)
        const { data: students } = await supabase
          .from("students")
          .select("id, name")
          .eq("parent_account_id", parents.id)
          .limit(1);

        const child = students?.[0];
        if (child) {
          setStudentId(String(child.id));
          
          // 3. Fetch Published Reports
          const { data: reports } = await supabase
            .from("published_reports")
            .select("*")
            .eq("student_id", child.id)
            .order("month", { ascending: false });

          if (reports) {
            setList(reports.map(r => ({
              id: String(r.id),
              title: `${r.month} Monthly Report`,
              date: r.created_at,
              month: r.month,
              studentName: child.name
            })));
          }
        }
      } catch (error) {
        console.error("Error fetching report list:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      
      <main className="px-4 md:px-6 py-8 max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
           <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-frage-navy flex items-center justify-center text-white shadow-lg shadow-frage-navy/20">
                <FileText className="w-5 h-5" />
             </div>
             월간 리포트
           </h1>
        </div>

        {loading ? (
          <div className="py-20 text-center font-bold text-slate-400">리포트를 불러오는 중...</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <FileText className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-1">발행된 리포트가 없습니다.</h3>
             <p className="text-slate-500 text-sm font-medium">리포트가 생성되면 이곳에서 확인하실 수 있습니다.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {list.map((item) => (
              <Link 
                key={item.id} 
                href={`/portal/report/${item.id}`}
                className="group bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm hover:shadow-md hover:border-frage-blue transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                     <span className="text-[10px] font-black text-slate-400 group-hover:text-frage-blue uppercase tracking-tighter">
                        {item.month.split(' ')[0]}
                     </span>
                     <span className="text-lg font-black text-slate-700 group-hover:text-frage-blue leading-none">
                        {item.month.split(' ')[1]}
                     </span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-frage-blue transition-colors mb-1">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-bold text-slate-400">
                       <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> {item.studentName}
                       </span>
                       <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {new Date(item.date).toLocaleDateString('ko-KR')}
                       </span>
                    </div>
                  </div>
                </div>
                
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-frage-blue group-hover:text-white transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
