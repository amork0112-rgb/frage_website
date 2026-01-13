"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, MessageSquare, Users, AlertCircle, ArrowRight, CheckCircle2, ChevronDown, Settings } from "lucide-react";
import { CampusType } from "@/data/notices";

type Dashboard = {
  newRequestsCount: number;
  noticesCount: number;
  guestInquiriesCount: number;
  todayAttendanceCount: number;
};

export default function AdminHome() {
  const [selectedCampus, setSelectedCampus] = useState<CampusType>("All");
  const [role, setRole] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/home?campus=${selectedCampus}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setDashboard(data);
      } else {
        setDashboard({ newRequestsCount: 0, noticesCount: 0, guestInquiriesCount: 0, todayAttendanceCount: 0 });
      }
    } catch {
      setDashboard({ newRequestsCount: 0, noticesCount: 0, guestInquiriesCount: 0, todayAttendanceCount: 0 });
    }
  }, [selectedCampus]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (!dashboard) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="h-6 w-40 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-64 bg-slate-100 rounded" />
          </div>
          <div className="h-10 w-44 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
        </div>
      </main>
    );
  }

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
                <p className="text-3xl font-black text-red-500">{dashboard.newRequestsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
            </div>
        </Link>
        <Link href="/admin/notices" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-orange-300 hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">게시중 공지</p>
                <p className="text-3xl font-black text-slate-900">{dashboard.noticesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-frage-orange flex items-center justify-center group-hover:bg-frage-orange group-hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
            </div>
        </Link>
        <Link href="/admin/new-students" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {selectedCampus === 'All' ? '신규생문의' : '캠퍼스 신규문의'}
                </p>
                <p className="text-3xl font-black text-slate-900">{dashboard.guestInquiriesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
            </div>
        </Link>
        <Link href="/admin/requests" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-green-300 hover:shadow-md transition-all">
          <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">오늘 출석률</p>
              <p className="text-3xl font-black text-green-600">{`${dashboard.todayAttendanceCount}%`}</p>
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
                    {dashboard.newRequestsCount > 0 ? (
                        <div className="p-4 text-sm text-slate-700">
                          신규 요청이 {dashboard.newRequestsCount}건 있습니다. 상세 확인은 요청 관리에서 진행해 주세요.
                        </div>
                    ) : (
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
