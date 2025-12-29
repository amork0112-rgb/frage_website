"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function AdminAcademicCalendarPage() {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin_calendar_url");
      const val = raw || "https://calendar.google.com/calendar/u/0/r/month/2026/1/27";
      setUrl(val);
      localStorage.setItem("admin_calendar_url", val);
    } catch {}
  }, []);
  const save = () => {
    const v = (url || "").trim();
    if (!v) return;
    localStorage.setItem("admin_calendar_url", v);
    alert("캘린더 주소가 저장되었습니다.");
  };
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900">학사 캘린더</h1>
        </div>
        <Link href="/admin/home" className="text-sm font-bold text-slate-700 underline underline-offset-4">대시보드</Link>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Google Calendar 주소를 입력하세요"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          />
          <button onClick={save} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">저장</button>
          <a href={url || "#"} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">새 탭으로 열기</a>
        </div>
        <div className="text-xs text-slate-500">
          Google Calendar에서 공유 설정을 공개로 변경하고 임베드 주소를 사용하는 것이 가장 안정적입니다.
        </div>
        <div className="aspect-[16/9] w-full bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
          <iframe src={url} className="w-full h-full" />
        </div>
      </div>
    </main>
  );
}
