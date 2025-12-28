"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, FileText, HelpCircle } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";

export default function ParentPortalHome() {
  const [monthlyReports, setMonthlyReports] = useState<{ id: string; title: string; date: string; status: string }[]>([]);
  const [notifications, setNotifications] = useState<{ id?: string; message: string; date?: string }[]>([]);
  const [studentId] = useState<string>(() => {
    try {
      const v = localStorage.getItem("portal_student_id");
      return v || "s8";
    } catch {
      return "s8";
    }
  });

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
        if (alive) {
          const list = (data?.items || []).map((n: any) => ({
            id: n.id,
            message: n.message,
            date: n.date
          }));
          setNotifications(list);
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />

      <main className="px-4 py-6 max-w-2xl mx-auto space-y-8">
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-frage-blue" />
            공지사항
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
            {notifications.length > 0 ? notifications.map((n, idx) => (
              <div key={n.id || idx} className="p-4">
                <p className="text-sm text-slate-800 font-medium">{n.message}</p>
                {n.date && <p className="text-xs text-slate-400 mt-1">{n.date}</p>}
              </div>
            )) : (
              <div className="p-4 text-sm text-slate-500">현재 공지사항이 없습니다.</div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-frage-navy" />
            학부모 포털 사용방법
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3 text-sm text-slate-700">
            <p className="font-bold text-slate-900">로그인 후 이용 가능한 주요 메뉴:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>영상 과제: 자녀의 오늘 과제를 녹화/확인합니다.</li>
              <li>월간 리포트: 학습 진행과 피드백을 확인합니다.</li>
              <li>공지사항: 학원 안내 및 공지 메시지를 확인합니다.</li>
              <li>요청 전달: 결석/지각/문의 등 전달 사항을 등록합니다.</li>
              <li>내 자녀: 자녀 기본 정보와 차량(등·하원) 정보를 관리합니다.</li>
            </ul>
            <p className="font-bold text-slate-900 mt-3">빠른 시작:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>상단 메뉴에서 원하는 기능으로 이동하세요.</li>
              <li>자녀 사진을 눌러 프로필 사진을 업로드할 수 있습니다.</li>
              <li>차량 정보 저장 후에는 포털 홈에서 최신 공지를 우선 확인하세요.</li>
            </ul>
          </div>
        </section>

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
