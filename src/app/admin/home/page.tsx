"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, MessageSquare, Users, AlertCircle, ArrowRight, CheckCircle2, ChevronDown, MapPin, Settings } from "lucide-react";
import { CampusType } from "@/data/notices";
import { supabase } from "@/lib/supabase";

type PortalRequest = {
  id: string;
  childId: string;
  childName: string;
  type: "absence" | "early_pickup" | "bus_change" | "medication";
  dateStart: string;
  dateEnd?: string;
  time?: string;
  changeType?: "no_bus" | "pickup_change" | "dropoff_change";
  medName?: string;
  note?: string;
  createdAt: string;
};

export default function AdminHome() {
  const [selectedCampus, setSelectedCampus] = useState<CampusType>('All');
  const [posts, setPosts] = useState<{ id: number; title: string; created_at: string; is_pinned: boolean; pinned_order?: number }[]>([]);
  const [recentRequests, setRecentRequests] = useState<
    { id: string; type: "Absence" | "Transport"; campus: CampusType | "Atheneum"; student: string; class: string; time: string; content: string }[]
  >([]);
  const [students, setStudents] = useState<any[]>([]);
  const [signups, setSignups] = useState<any[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const relTime = (iso: string) => {
      const now = Date.now();
      const t = new Date(iso).getTime();
      const diffMin = Math.max(0, Math.round((now - t) / 60000));
      if (diffMin < 1) return "방금 전";
      if (diffMin < 60) return `${diffMin}분 전`;
      const diffHr = Math.round(diffMin / 60);
      if (diffHr < 24) return `${diffHr}시간 전`;
      const diffDay = Math.round(diffHr / 24);
      return `${diffDay}일 전`;
    };
    const fetchRequests = async () => {
      const { data } = await supabase
        .from("portal_requests")
        .select(`
          id,
          type,
          created_at,
          payload,
          student_id,
          students (
            id,
            name,
            class_name,
            campus
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      const list = (data || []) as any[];
      const mapped = list.map((r: any) => {
        const payload = r?.payload || {};
        const campus = (r?.students?.campus as CampusType | "Atheneum") || "International";
        const studentName: string = r?.students?.name || "-";
        const className: string = r?.students?.class_name || "-";
        const content =
          r?.type === "absence"
            ? `${payload?.dateStart || ""}${payload?.dateEnd ? `~${payload?.dateEnd}` : ""} 결석 신청${payload?.note ? ` / ${payload?.note}` : ""}`
            : r?.type === "medication"
            ? `복약: ${payload?.medName || ""}${payload?.note ? ` / ${payload?.note}` : ""}`
            : r?.type === "early_pickup"
            ? `조기하원: ${payload?.time || ""}${payload?.note ? ` / ${payload?.note}` : ""}`
            : r?.type === "bus_change"
            ? `차량 변경: ${payload?.changeType || ""}${payload?.note ? ` / ${payload?.note}` : ""}`
            : payload?.note || "";
        return {
          id: r.id,
          type: r?.type === "absence" ? ("Absence" as const) : ("Transport" as const),
          campus,
          student: studentName,
          class: className,
          time: relTime(r.created_at),
          content: String(content),
        };
      });
      setRecentRequests(mapped);
    };
    fetchRequests();
    const timer = setInterval(fetchRequests, 12000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) {
          setRole(null);
          return;
        }
        const appRole = (user.app_metadata as any)?.role ?? null;
        setRole(appRole ? String(appRole) : null);
      } catch {}
    })();
  }, []);

  // Filter Logic
  const filteredRequests = selectedCampus === 'All'
    ? recentRequests
    : recentRequests.filter(req => req.campus === selectedCampus);

  useEffect(() => {
    const load = async () => {
      const { data: studentData } = await supabase
        .from("students")
        .select("id,name,campus,status");
      setStudents(studentData || []);
      const { data: signupData } = await supabase
        .from("signups")
        .select("id,campus,status");
      setSignups(signupData || []);
      const { data: absenceData } = await supabase
        .from("portal_requests")
        .select(`
          id,
          type,
          payload,
          student_id,
          students (
            campus
          )
        `)
        .eq("type", "absence")
        .order("created_at", { ascending: false })
        .limit(1000);
      setAbsenceRequests(absenceData || []);
    };
    load();
    const timer = setInterval(load, 12000);
    return () => clearInterval(timer);
  }, []);

  const totalStudents = useMemo(() => {
    const list = students.filter((s) => (s.status || "재원") === "재원");
    if (selectedCampus === "All") return list.length;
    return list.filter((s) => s.campus === selectedCampus).length;
  }, [students, selectedCampus]);
  const newInquiryCount = useMemo(() => {
    const list = signups.filter((p) => (p.status || "waiting") !== "enrolled");
    if (selectedCampus === "All") return list.length;
    return list.filter((p) => p.campus === selectedCampus).length;
  }, [signups, selectedCampus]);

  const todaysAbsences = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    const inRange = (start?: string, end?: string) => {
      if (!start) return false;
      if (end && end >= start) {
        return todayStr >= start && todayStr <= end;
      }
      return todayStr === start;
    };
    const arr = absenceRequests.filter((r: any) => {
      const payload = r?.payload || {};
      return r?.type === "absence" && inRange(payload?.dateStart, payload?.dateEnd);
    });
    if (selectedCampus === "All") return arr.length;
    return arr.filter((r: any) => (r?.students?.campus as CampusType | "Atheneum") === selectedCampus).length;
  }, [selectedCampus, absenceRequests]);

  const attendanceRate = useMemo(() => {
    if (!totalStudents) return "—";
    const present = Math.max(0, totalStudents - todaysAbsences);
    const pct = Math.round((present / totalStudents) * 100);
    return `${pct}%`;
  }, [totalStudents, todaysAbsences]);

  const stats = {
    newRequests: filteredRequests.length,
    activeNotices: posts.filter(p => p.is_pinned).length,
    totalStudents,
    newInquiries: newInquiryCount,
    attendance: attendanceRate,
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("posts").select("id,title,created_at,is_pinned,pinned_order").order("created_at", { ascending: false });
      const list = (data || []) as any[];
      const sorted = list
        .slice()
        .sort((a, b) => {
          const ap = a.is_pinned ? 0 : 1;
          const bp = b.is_pinned ? 0 : 1;
          if (ap !== bp) return ap - bp;
          const ao = typeof a.pinned_order === "number" ? a.pinned_order : 9999;
          const bo = typeof b.pinned_order === "number" ? b.pinned_order : 9999;
          if (ao !== bo) return ao - bo;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      setPosts(sorted);
    };
    load();
    const timer = setInterval(load, 12000);
    return () => clearInterval(timer);
  }, []);

  const pinnedCount = posts.filter(p => p.is_pinned).length;
  const updatePin = async (id: number, nextPinned: boolean, nextOrder?: number) => {
    if (nextPinned && !posts.find(p => p.id === id)?.is_pinned && pinnedCount >= 5) {
      alert("상단 고정은 최대 5개까지 가능합니다.");
      return;
    }
    const { error } = await supabase
      .from("posts")
      .update({ is_pinned: nextPinned, pinned_order: nextOrder ?? null, pinned: nextPinned })
      .eq("id", id);
    if (!error) {
      const next = posts.map(p => p.id === id ? { ...p, is_pinned: nextPinned, pinned_order: nextOrder } : p);
      setPosts(next);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-black text-slate-900">관리자 대시보드</h1>
            <p className="text-slate-500 mt-1">학원 운영 현황 및 학부모 요청 통합 관리</p>
        </div>
        
        {/* Campus Filter Dropdown */}
        <div className="relative">
            <select 
                className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-4 pr-10 rounded-lg text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-frage-blue cursor-pointer min-w-[180px]"
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value as CampusType)}
            >
                <option value="All">전체 캠퍼스</option>
                <option value="International">국제관</option>
                <option value="Andover">앤도버</option>
                <option value="Platz">플라츠</option>
                <option value="Atheneum">아테네움관</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <Link href="/admin/requests" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-red-300 hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">신규 요청</p>
                <p className="text-3xl font-black text-red-500">{stats.newRequests}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
            </div>
        </Link>
        <Link href="/admin/notices" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-orange-300 hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">게시중 공지</p>
                <p className="text-3xl font-black text-slate-900">{stats.activeNotices}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-frage-orange flex items-center justify-center group-hover:bg-frage-orange group-hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
            </div>
        </Link>
        <Link href="/admin/new-students" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {selectedCampus === 'All' ? '신규테스트문의' : '캠퍼스 신규문의'}
                </p>
                <p className="text-3xl font-black text-slate-900">{stats.newInquiries}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
            </div>
        </Link>
        <Link href="/admin/requests" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-green-300 hover:shadow-md transition-all">
          <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">오늘 출석률</p>
              <p className="text-3xl font-black text-green-600">{stats.attendance}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-5 h-5" />
          </div>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Urgent Tasks */}
        <section className="md:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                긴급 요청 ({selectedCampus === 'All' ? '전체' : selectedCampus})
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {filteredRequests.length > 0 ? filteredRequests.slice(0, 3).map((req) => (
                        <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${req.type === 'Absence' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}></div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900">{req.type === 'Absence' ? '결석 신청' : '차량/하원 변경'}</h3>
                                        {selectedCampus === 'All' && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                                req.campus === 'International' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                req.campus === 'Andover' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                'bg-green-50 text-green-600 border-green-100'
                                            }`}>
                                                {req.campus === 'International' ? '국제관' : req.campus === 'Andover' ? '앤도버' : '플라츠'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{req.time}</span>
                                </div>
                                <p className="text-sm text-slate-600 mb-2">학생: <span className="font-bold">{req.student}</span> (Class {req.class})</p>
                                <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                                    {req.content}
                                </p>
                            </div>
                            <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 whitespace-nowrap">
                                확인
                            </button>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            접수된 요청이 없습니다.
                        </div>
                    )}
                </div>
                <Link href="/admin/requests" className="block p-3 text-center text-sm font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 transition-colors border-t border-slate-200">
                    전체 요청 보기
                </Link>
            </div>
        </section>

        {/* Quick Links */}
        <section>
             <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-slate-400" />
                빠른 실행
             </h2>
            <div className="space-y-3">
                <Link href="/admin/notices/new" className="group block bg-white p-4 rounded-xl border border-slate-200 hover:border-frage-orange hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 text-frage-orange flex items-center justify-center group-hover:bg-frage-orange group-hover:text-white transition-colors">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">새 공지 등록</h3>
                                <p className="text-xs text-slate-500">전체 또는 캠퍼스별 공지 작성</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-frage-orange group-hover:translate-x-1 transition-all" />
                    </div>
                </Link>

                <Link href="/admin/requests" className="group block bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">요청 사항 관리</h3>
                                <p className="text-xs text-slate-500">결석 및 차량 변경 요청 확인</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                </Link>

                {role === "master_admin" && (
                  <Link href="/admin/master" className="group block bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">마스터 관리</h3>
                          <p className="text-xs text-slate-500">운영 핵심 설정 페이지</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-800 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                )}
            </div>
        </section>

        

      </div>
    </main>
  );
}
