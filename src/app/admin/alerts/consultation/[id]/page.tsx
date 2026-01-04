"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AlertsConsultationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [returnHint, setReturnHint] = useState<string>("");
  const [student, setStudent] = useState<any>(null);
  const [memos, setMemos] = useState<any[]>([]);
  const [newMemo, setNewMemo] = useState<string>("");
  const [newMemoTag, setNewMemoTag] = useState<string>("기타");

  useEffect(() => {
    const run = async () => {
      const { data: sig } = await supabase.from("alert_signals").select("*").eq("id", id).single();
      const signal = sig || null;
      let s = null;
      if (signal?.student_id) {
        const { data: studentRow } = await supabase.from("students").select("*").eq("id", signal.student_id).single();
        if (studentRow) {
          s = {
            id: String(studentRow.id),
            name: String(studentRow.name ?? ""),
            campus: String(studentRow.campus ?? ""),
            className: String(studentRow.class_name ?? ""),
          };
        }
      } else if (signal) {
        s = {
          id: String(signal.student_id ?? ""),
          name: String(signal.name ?? ""),
          campus: String(signal.campus ?? ""),
          className: String(signal.class_name ?? ""),
        };
      }
      setStudent(s);
      const { data: memoRows } = await supabase
        .from("alert_consult_memos")
        .select("*")
        .eq("signal_id", id)
        .order("created_at", { ascending: false });
      setMemos(Array.isArray(memoRows) ? memoRows.map((m: any) => ({
        text: String(m.text ?? ""),
        author: String(m.author ?? ""),
        at: String(m.created_at ?? m.at ?? ""),
        tag: String(m.tag ?? "기타"),
      })) : []);
    };
    run();
  }, [id]);

  const saveMemo = async () => {
    if (!newMemo.trim()) return;
    const { data } = await supabase.auth.getUser();
    const author = String(data?.user?.email ?? "관리자");
    const at = new Date().toISOString();
    await supabase
      .from("alert_consult_memos")
      .insert({
        signal_id: id,
        text: newMemo.trim(),
        author,
        tag: newMemoTag,
        at,
      });
    setMemos(prev => [{ text: newMemo.trim(), author, at, tag: newMemoTag }, ...prev]);
    setNewMemo("");
    setNewMemoTag("기타");
  };

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
              <div className="mt-1 flex items-center gap-2">
                <select
                  value={newMemoTag}
                  onChange={(e) => setNewMemoTag(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="기타">기타</option>
                  <option value="상담">상담</option>
                  <option value="결제">결제</option>
                  <option value="특이사항">특이사항</option>
                </select>
                <textarea
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  rows={4}
                  placeholder="간단 메모"
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                />
              </div>
            </label>
            <div className="mt-2 flex justify-end">
              <button onClick={saveMemo} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">저장</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
