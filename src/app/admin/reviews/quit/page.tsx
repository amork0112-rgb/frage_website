"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type InboxItem = {
  id: string;
  name: string;
  campus: string;
  className: string;
  consultDate: string;
  consultMethod: "전화" | "대면";
  consultContent: string;
  consultResult: string;
};

export default function QuitReviewPage() {
  const [items, setItems] = useState<InboxItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("student_leave_effects")
          .select("*")
          .order("consult_date", { ascending: false });
        const list: InboxItem[] = Array.isArray(data)
          ? data.map((row: any) => ({
              id: String(row.id),
              name: String(row.student_name ?? ""),
              campus: String(row.campus ?? "International"),
              className: String(row.class_name ?? ""),
              consultDate: String(row.consult_date ?? ""),
              consultMethod: (String(row.consult_method ?? "전화") as InboxItem["consultMethod"]),
              consultContent: String(row.consult_content ?? ""),
              consultResult: String(row.consult_result ?? ""),
            }))
          : [];
        setItems(list);
      } catch {
        setItems([]);
      }
    };
    load();
  }, []);

  const removeItem = (id: string) => {
    (async () => {
      try {
        await supabase
          .from("student_leave_effects")
          .update({ handled: true })
          .eq("id", Number(id));
        await supabase.from("student_status_logs").insert({
          student_id: Number(id),
          action: "quit_review_handled",
          memo: "퇴원 검토 Inbox 제거",
          created_at: new Date().toISOString(),
        });
        setItems(prev => prev.filter(x => x.id !== id));
        alert("처리됨: 퇴원 검토 Inbox에서 제거되었습니다.");
      } catch {
      }
    })();
  };

  const restoreItem = (it: InboxItem) => {
    (async () => {
      try {
        await supabase.from("student_status_logs").insert({
          student_id: Number(it.id),
          action: "restore_leave_review",
          new_status: "휴원 검토중",
          memo: "퇴원 검토에서 복구",
          created_at: new Date().toISOString(),
        });
        await supabase
          .from("student_leave_effects")
          .update({ handled: true })
          .eq("id", Number(it.id));
        setItems(prev => prev.filter(x => x.id !== it.id));
        alert("복구됨: 상태가 휴원 검토중으로 복귀되었습니다.");
      } catch {
      }
    })();
  };

  const sorted = useMemo(() => {
    return items.slice().sort((a, b) => new Date(b.consultDate).getTime() - new Date(a.consultDate).getTime());
  }, [items]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">퇴원 검토 상담 Inbox</h1>
          <p className="text-slate-500 mt-1 text-sm">‘퇴원 검토중’ 전환된 상담기록이 자동으로 여기에 모입니다.</p>
        </div>
        <Link href="/admin/students" className="text-sm font-bold text-frage-blue">원생 관리</Link>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {sorted.map((it) => (
            <div key={it.id} className="p-4 flex items-start justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900">{it.name} ({it.campus} {it.className})</div>
                <div className="text-xs text-slate-500 mt-0.5">상담일자: {it.consultDate} • 방식: {it.consultMethod}</div>
                <div className="text-sm text-slate-700 mt-2">{it.consultContent}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => removeItem(it.id)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">처리됨</button>
                <button onClick={() => restoreItem(it)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">복구</button>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">표시할 항목이 없습니다.</div>
          )}
        </div>
      </div>
    </main>
  );
}
