"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, AlertTriangle, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Status = "재원" | "휴원 검토중" | "휴원" | "퇴원 검토중" | "퇴원";
type SignalType = "video_miss" | "portal_low" | "report_unread";

type AlertItem = {
  id: string;
  name: string;
  campus: string;
  className: string;
  status: Status;
  signals: { type: SignalType; value: string }[];
  level: "주의" | "경고" | "위험";
  firstDetectedAt: string;
  unread?: boolean;
  source?: "portal_requests" | "new_student_checklists" | "student_reservations";
};

export default function TeacherAlertsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [selected, setSelected] = useState<AlertItem | null>(null);
  const [action, setAction] = useState<"확인함" | "상담 필요" | "경과 관찰" | "">("");
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<"All" | "휴원 검토중" | "퇴원 검토중">("All");
  const [toast, setToast] = useState<string>("");
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id || null;
      setTeacherId(uid);
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: reqs } = await
        supabase
          .from("portal_requests")
          .select(`
            id,
            type,
            created_at,
            teacher_read,
            teacher_id,
            student_id,
            students ( name, class_name, campus, status )
          `)
          .order("created_at", { ascending: false })
      ;
      const nowList: AlertItem[] = (reqs || []).map((r: any) => ({
        id: String(r.id),
        name: String(r?.students?.name || "-"),
        campus: String(r?.students?.campus || "-"),
        className: String(r?.students?.class_name || "-"),
        status: (r?.students?.status as Status) || "재원",
        signals: [{ type: "report_unread", value: String(r.type || "") }],
        level: r.type === "early_pickup" || r.type === "medication" ? "주의" : "경고",
        firstDetectedAt: String(r.created_at || ""),
        unread: !r?.teacher_read,
        source: "portal_requests",
      }));
      const { data: checks } = await
        supabase
          .from("new_student_checklists")
          .select(`
            id,
            student_id,
            created_at,
            checked,
            checked_at,
            checked_by,
            new_students ( student_name, campus )
          `)
          .eq("checked", false)
          .order("created_at", { ascending: false });
      const chkList: AlertItem[] = (checks || [])
        .map((c: any) => ({
          id: `chk_${c.id}`,
          name: String(c?.new_students?.student_name || "-"),
          campus: String(c?.new_students?.campus || "-"),
          className: "-",
          status: "재원",
          signals: [{ type: "report_unread", value: "new_student_checklist_pending" }],
          level: "주의",
          firstDetectedAt: String(c.created_at || c.checked_at || ""),
          unread: true,
          source: "new_student_checklists",
        }));
      const merged = [...nowList, ...chkList]
        .slice()
        .sort((a, b) => {
          const au = a.unread ? 0 : 1;
          const bu = b.unread ? 0 : 1;
          if (au !== bu) return au - bu;
          return new Date(b.firstDetectedAt).getTime() - new Date(a.firstDetectedAt).getTime();
        });
      setItems(merged);
    };
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, []);

  const filteredByClass = useMemo(() => {
    return items;
  }, [items]);

  useEffect(() => {
    if (!selected) {
      setSelectedLogs([]);
      return;
    }
    setSelectedLogs([]);
  }, [selected]);

  const byQuit = useMemo(() => filteredByClass.filter(it => it.status === "퇴원 검토중"), [filteredByClass]);
  const byLeave = useMemo(() => filteredByClass.filter(it => it.status === "휴원 검토중"), [filteredByClass]);

  const levelBadge = (level: AlertItem["level"]) => {
    if (level === "위험") return <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">위험</span>;
    if (level === "경고") return <span className="text-xs font-bold px-2 py-1 rounded bg-amber-100 text-amber-700">경고</span>;
    return <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">주의</span>;
  };

  const openDetail = (item: AlertItem) => {
    setSelected(item);
    setAction("");
    if (item.source === "portal_requests") {
      supabase.from("portal_requests").update({ teacher_read: true }).eq("id", item.id);
      setItems(prev => prev.map(p => (p.id === item.id ? { ...p, unread: false } : p)));
    }
  };

  const commitAction = () => {
    if (!selected || !action) return;
    setAction("");
  };

  const appendLog = (id: string, message: string) => {
    setSelectedLogs(prev => [message, ...prev]);
  };

  const handleConfirmAdmin = async () => {
    if (!selected) return;
    const userId = teacherId || "교사";
    const signalId = selected.id;
    const ts = new Date().toLocaleString("ko-KR");
    try {
      const res = await fetch("/api/alerts/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", userId, signalId }),
      });
      const ok = res.ok;
      const msg = `[${ts}] 관리자 확인 처리 완료 (사용자 ID: ${userId} , 시그널 ID: ${signalId}) 상태: ${ok ? "성공" : "실패"}`;
      appendLog(signalId, msg);
    } catch {
      const msg = `[${ts}] 관리자 확인 처리 완료 (사용자 ID: ${userId} , 시그널 ID: ${signalId}) 상태: 실패`;
      appendLog(signalId, msg);
    }
  };

  const handleNeedConsult = async () => {
    if (!selected) return;
    const userId = teacherId || "교사";
    const signalId = selected.id;
    const ts = new Date().toLocaleString("ko-KR");
    setToast("상담 요청이 접수되었습니다");
    setTimeout(() => setToast(""), 1200);
    try {
      const res = await fetch("/api/alerts/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "need_consult", userId, signalId }),
      });
      const ok = res.ok;
      const msg = `[${ts}] 상담 요청 처리 (사용자 ID: ${userId} , 시그널 ID: ${signalId}) 상태: ${ok ? "성공" : "실패"}`;
      appendLog(signalId, msg);
    } catch {
      const msg = `[${ts}] 상담 요청 처리 (사용자 ID: ${userId} , 시그널 ID: ${signalId}) 상태: 실패`;
      appendLog(signalId, msg);
    } finally {
      setTimeout(() => {
        router.push(`/admin/alerts/consultation/${selected.id}`);
      }, 300);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">내부 알림</h1>
        </div>
        <Link href="/teacher/students" className="text-sm font-bold text-frage-blue">원생 관리</Link>
      </div>

      {!!toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="mb-4">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setStatusTab("All")}
            className={`px-3 py-2 text-sm font-bold ${statusTab === "All" ? "bg-slate-100 text-slate-900" : "text-slate-700"}`}
          >
            전체
          </button>
          <button
            onClick={() => setStatusTab("휴원 검토중")}
            className={`px-3 py-2 text-sm font-bold border-l border-slate-200 ${statusTab === "휴원 검토중" ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
          >
            휴원 검토중
          </button>
          <button
            onClick={() => setStatusTab("퇴원 검토중")}
            className={`px-3 py-2 text-sm font-bold border-l border-slate-200 ${statusTab === "퇴원 검토중" ? "bg-orange-50 text-orange-700" : "text-slate-700"}`}
          >
            퇴원 검토중
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {(statusTab === "퇴원 검토중" ? byQuit : statusTab === "휴원 검토중" ? byLeave : filteredByClass).map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {item.level === "위험" ? <ShieldAlert className="w-5 h-5 text-red-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
              <div>
                {item.status === "퇴원 검토중" ? (
                  <>
                    <div className="font-bold text-slate-900">내부 상담 요청</div>
                    <div className="text-sm text-slate-700">
                      {item.name} ({item.campus} {item.className}) 퇴원 검토 상태로 전환됨 • 담임 상담 필요
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">최초 감지: {item.firstDetectedAt}</div>
                  </>
                ) : item.status === "휴원 검토중" ? (
                  <>
                    <div className="font-bold text-slate-900">내부 상담 요청</div>
                    <div className="text-sm text-slate-700">
                      {item.name} ({item.campus} {item.className}) 휴원 검토 상태로 전환됨 • 담임 상담 필요
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">최초 감지: {item.firstDetectedAt}</div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-slate-900">⚠️ 이탈 위험 감지</div>
                    <div className="text-sm text-slate-700">
                      {item.name} ({item.campus} {item.className}) 최근
                      {item.signals.some(s => s.type === "video_miss") ? " 영상 과제 미제출" : ""}
                      {item.signals.some(s => s.type === "portal_low") ? " 및 포털 미접속" : ""}
                      {item.signals.some(s => s.type === "report_unread") ? " 및 리포트 미열람" : ""}
                      이 감지되었습니다.
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">최초 감지: {item.firstDetectedAt}</div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {levelBadge(item.level)}
              <button onClick={() => openDetail(item)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">자세히</button>
            </div>
          </div>
        ))}

        {((statusTab === "퇴원 검토중" ? byQuit : statusTab === "휴원 검토중" ? byLeave : filteredByClass).length === 0) && (
          <div className="text-center text-slate-500 py-10">표시할 내부 알림이 없습니다.</div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-[420px] bg-white border-l border-slate-200 shadow-xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">이탈 시그널 상세</h3>
              <button onClick={() => setSelected(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">학생 이름</span>
                <span className="text-sm font-bold text-slate-800">{selected.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">캠퍼스 / 반</span>
                <span className="text-sm font-bold text-slate-800">{selected.campus} / {selected.className}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">재원 상태</span>
                <span className="text-sm font-bold text-slate-800">{selected.status}</span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 mb-1">감지된 시그널</div>
                <div className="space-y-1">
                  {selected.signals.map((s, i) => (
                    <div key={i} className="text-sm text-slate-800">
                      {s.type === "video_miss" ? "영상 과제 미제출" : s.type === "portal_low" ? "포털 미접속" : "리포트 미열람"} {s.value}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">최초 감지 날짜</span>
                <span className="text-sm font-bold text-slate-800">{selected.firstDetectedAt}</span>
              </div>
              </div>
              <div className="mt-6">
                <div className="text-xs font-bold text-slate-400 mb-1">관리자 액션</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleConfirmAdmin} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">관리자 확인</button>
                  <button onClick={handleNeedConsult} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">상담 필요</button>
                  <select value={action} onChange={(e) => setAction(e.target.value as any)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="">선택</option>
                    <option value="확인함">확인함</option>
                    <option value="상담 필요">상담 필요</option>
                    <option value="경과 관찰">경과 관찰</option>
                  </select>
                  <button onClick={commitAction} disabled={!action} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white disabled:opacity-50">기록</button>
                </div>
                <div className="text-xs text-slate-400 mt-2">기록은 수정/삭제할 수 없습니다.</div>
              </div>
              <div className="mt-6 flex-1 overflow-auto">
                <div className="text-xs font-bold text-slate-400 mb-2">액션 로그</div>
                <div className="space-y-1">
                  {selectedLogs.map((line, idx) => (
                    <div key={idx} className="text-xs text-slate-600 whitespace-pre-line">{line}</div>
                  ))}
                  {selectedLogs.length === 0 && (
                    <div className="text-xs text-slate-400">로그 없음</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}
