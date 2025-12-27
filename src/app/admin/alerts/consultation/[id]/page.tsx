"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AlertsConsultationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [returnHint, setReturnHint] = useState<string>("");
  const [student, setStudent] = useState<any>(null);
  const [memos, setMemos] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin_alerts_return_state");
      const state = raw ? JSON.parse(raw) : null;
      if (state?.selectedId) {
        setReturnHint(`이전 상태 저장됨 • 선택된 시그널: ${state.selectedId}`);
      }
    } catch {
      setReturnHint("");
    }
    try {
      const updatesRaw = localStorage.getItem("admin_student_updates");
      const updates = updatesRaw ? JSON.parse(updatesRaw) : {};
      const studentsRaw = localStorage.getItem("admin_students");
      const students = studentsRaw ? JSON.parse(studentsRaw) : [];
      const s = students.find((x: any) => x.id === id) || null;
      setStudent(s ? { ...s, ...(updates[id] || {}) } : null);
      const memosRaw = localStorage.getItem("admin_memos");
      const memosMap = memosRaw ? JSON.parse(memosRaw) : {};
      setMemos(memosMap[id] || []);
    } catch {}
  }, [id]);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900">상담 페이지</h1>
        <Link href="/admin/alerts" className="text-sm font-bold text-frage-blue">내부 알림</Link>
      </div>
      <p className="text-slate-500 mt-1">시그널 ID: {id}</p>
      {returnHint && <div className="mt-3 text-xs font-bold text-slate-600">{returnHint}</div>}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="space-y-4">
          {student && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">학생 이름</span>
                <span className="text-sm font-bold text-slate-800">{student.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">캠퍼스 / 반</span>
                <span className="text-sm font-bold text-slate-800">{student.campus} / {student.className}</span>
              </div>
            </div>
          )}
          <div>
            <div className="text-sm font-bold text-slate-900 mb-2">상담 메모</div>
            <div className="space-y-2">
              {memos.map((m, i) => (
                <div key={i} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-sm text-slate-800">[{m.tag || "기타"}] {m.text}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{m.author} • {new Date(m.at).toLocaleString("ko-KR")}</div>
                </div>
              ))}
              {memos.length === 0 && (
                <div className="text-xs text-slate-400">등록된 메모가 없습니다.</div>
              )}
            </div>
          </div>
          <div>
            <label className="block">
              <span className="text-xs font-bold text-slate-700">상담 메모 추가</span>
              <textarea className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" rows={4} placeholder="간단 메모" />
            </label>
            <div className="mt-2 flex justify-end">
              <button className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">저장</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
