"use client";

import Link from "next/link";
import { Calendar, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";

export default function AdminAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [campus, setCampus] = useState("All");

  const data = useMemo(() => {
    const total = 120;
    const present = campus === "International" ? 42 : campus === "Andover" ? 36 : campus === "Platz" ? 30 : 108;
    const absent = total - present;
    const rate = Math.round((present / total) * 100);
    return { total, present, absent, rate };
  }, [campus]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-frage-blue" />
          <h1 className="text-2xl font-black text-slate-900">오늘 출석률</h1>
        </div>
        <Link href="/admin/home" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-2">캠퍼스</label>
          <div className="flex flex-wrap gap-2">
            {["All", "International", "Andover", "Platz"].map((c) => (
              <button
                key={c}
                onClick={() => setCampus(c)}
                className={`px-3 py-2 rounded-lg border text-sm font-bold ${
                  campus === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                {c === "All" ? "전체" : c === "International" ? "국제관" : c === "Andover" ? "앤도버" : "플라츠"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">전체</p>
          <p className="text-3xl font-black text-slate-900">{data.total}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">출석</p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <p className="text-3xl font-black text-green-600">{data.present}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">결석</p>
          <div className="flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-600" />
            <p className="text-3xl font-black text-red-600">{data.absent}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">출석률</p>
          <p className="text-3xl font-black text-frage-blue">{data.rate}%</p>
        </div>
      </div>
    </main>
  );
}
