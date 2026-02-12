"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CAMPUS_CONFIG } from "@/config/campus";
import { supabase } from "@/lib/supabase";

type Stats = {
  students: {
    totalActive: number;
    byCampus: Record<string, number>;
    monthlyRegistrations: [string, number][];
  };
  conversion: {
    totalConsultations: number;
    totalPromoted: number;
    overallRate: number;
    byCampus: Record<string, number>;
  };
  withdrawal: {
    count: number;
    rate: number;
  };
};

export default function MasterDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        
        const email = user.email || "";
        const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || "";
        const isMaster = (profile?.role === "master_admin") || (!!email && !!masterEmail && email.toLowerCase() === masterEmail.toLowerCase());
        
        setAuthorized(isMaster);
      } catch (error) {
        console.error("Auth check failed:", error);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/master/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch master stats:", error);
      }
    };
    if (authorized) {
      fetchStats();
    }
  }, [authorized]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-400 text-lg animate-pulse">데이터를 불러오는 중...</div>;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm shadow-sm">
          <h1 className="text-xl font-black text-slate-900 mb-2">접근 권한 없음</h1>
          <p className="text-slate-500 text-sm mb-6">Master Admin 전용 페이지입니다.</p>
          <button 
            onClick={() => router.push("/portal/admin/home")}
            className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold text-sm"
          >
            관리자 홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-400">데이터가 없습니다.</div>;
  }

  const campuses = Object.keys(CAMPUS_CONFIG);

  const LineChart = ({ data, color = "stroke-slate-600" }: { data: number[], color?: string }) => {
    if (!data.length) return <div className="h-20 flex items-center justify-center text-[10px] text-slate-300">데이터 없음</div>;
    const max = Math.max(1, ...data);
    const w = 300;
    const h = 60;
    const step = w / (data.length - 1 || 1);
    const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");
    
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className={color}
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">MANAGEMENT OVERVIEW</div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">전사 통합 대시보드</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              엑셀 보고서 다운로드
            </button>
            <div className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">
              실시간 데이터
            </div>
          </div>
        </div>

        {/* 핵심 KPI 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="text-xs font-bold text-slate-400 uppercase mb-4">전체 재원생</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-black text-slate-900">{stats.students.totalActive.toLocaleString()}</div>
              <div className="text-sm font-bold text-slate-500">명</div>
            </div>
            <div className="mt-6">
              <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase">최근 6개월 등록 추이</div>
              <LineChart data={stats.students.monthlyRegistrations.map(r => r[1])} color="stroke-blue-500" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="text-xs font-bold text-slate-400 uppercase mb-4">상담 전환율</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-black text-slate-900">{stats.conversion.overallRate.toFixed(1)}</div>
              <div className="text-sm font-bold text-slate-500">%</div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2 uppercase">
                <span>전환 퍼널</span>
                <span>{stats.conversion.totalPromoted} / {stats.conversion.totalConsultations}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${stats.conversion.overallRate}%` }}
                />
              </div>
              <div className="mt-2 text-[10px] text-slate-400 font-medium">
                총 상담 {stats.conversion.totalConsultations}건 중 {stats.conversion.totalPromoted}건 등록 완료
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="text-xs font-bold text-slate-400 uppercase mb-4">당월 퇴원율</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-black text-slate-900">{stats.withdrawal.rate.toFixed(1)}</div>
              <div className="text-sm font-bold text-slate-500">%</div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2 uppercase">
                <span>퇴원 관리 현황</span>
                <span>{stats.withdrawal.count}명</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${stats.withdrawal.rate > 5 ? 'bg-rose-500' : 'bg-slate-400'}`}
                  style={{ width: `${Math.min(100, stats.withdrawal.rate * 10)}%` }}
                />
              </div>
              <div className="mt-2 text-[10px] text-slate-400 font-medium">
                전체 {stats.students.totalActive}명 중 {stats.withdrawal.count}명 퇴원 처리 (이번 달)
              </div>
            </div>
          </div>
        </div>

        {/* 캠퍼스별 세부 지표 */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">캠퍼스별 경영 성과 지표</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white">
                  <th className="text-left px-6 py-4">캠퍼스</th>
                  <th className="text-right px-6 py-4">재원생</th>
                  <th className="text-right px-6 py-4">상담 전환율</th>
                  <th className="text-right px-6 py-4">상담 성과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {campuses.map((c) => {
                  const activeCount = stats.students.byCampus[c] || 0;
                  const convRate = stats.conversion.byCampus[c] || 0;
                  return (
                    <tr key={c} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-900">{c}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700">
                        {activeCount.toLocaleString()}명
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-xs font-black ${convRate > 60 ? 'text-emerald-600' : convRate > 40 ? 'text-slate-900' : 'text-rose-600'}`}>
                            {convRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="w-32 ml-auto h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${convRate > 60 ? 'bg-emerald-500' : 'bg-slate-400'}`}
                            style={{ width: `${convRate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 트렌드 분석 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 uppercase mb-6 tracking-tight">신규 등록 추이 (6개월)</h3>
            <div className="h-40 flex items-end gap-2">
              {stats.students.monthlyRegistrations.map(([month, count], i) => {
                const max = Math.max(1, ...stats.students.monthlyRegistrations.map(r => r[1]));
                const height = (count / max) * 100;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full bg-slate-100 rounded-t-sm group-hover:bg-blue-100 transition-colors relative" style={{ height: `${height}%` }}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {count}
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                      {month.split('-')[1]}월
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 uppercase mb-6 tracking-tight">데이터 요약 및 인사이트</h3>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg font-bold">!</div>
                <div>
                  <div className="text-xs font-bold text-slate-900 mb-1">성장 지표</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    현재 전체 재원생은 {stats.students.totalActive}명이며, 최근 {stats.students.monthlyRegistrations[stats.students.monthlyRegistrations.length - 1]?.[1]}명의 신규 등록이 있었습니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg font-bold">✓</div>
                <div>
                  <div className="text-xs font-bold text-slate-900 mb-1">전환 성과</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    평균 {stats.conversion.overallRate.toFixed(1)}%의 전환율을 기록하고 있습니다. 상담 관리 프로세스가 안정적으로 운영되고 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
