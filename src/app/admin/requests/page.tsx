"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Calendar, Clock, Bus, Pill, Users, Bell, AlertCircle, ArrowRight, LayoutGrid } from "lucide-react";
import { supabase } from "@/lib/supabase";

type RequestType = "absence" | "early_pickup" | "bus_change" | "medication";
type TabType = "all" | RequestType;

type PortalRequest = {
  id: string;
  childId: string;
  childName: string;
  campus: string;
  className?: string;
  type: RequestType;
  dateStart: string;
  dateEnd?: string;
  time?: string;
  note?: string;
  changeType?: "no_bus" | "pickup_change" | "dropoff_change";
  medName?: string;
  teacherRead?: boolean;
  createdAt: string;
};

export default function AdminRequestsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [campusFilter, setCampusFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState<RequestType>("absence");
  const [newChildName, setNewChildName] = useState("");
  const [newDateStart, setNewDateStart] = useState("");
  const [newDateEnd, setNewDateEnd] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newChangeType, setNewChangeType] = useState<"no_bus" | "pickup_change" | "dropoff_change">("no_bus");
  const [newMedName, setNewMedName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newCampus, setNewCampus] = useState<string>("International");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/requests");
        const payload = await res.json();
        const rows = Array.isArray(payload?.items) ? payload.items : [];
        const list: PortalRequest[] = rows.map((row: any) => ({
          id: String(row.id),
          childId: String(row.childId ?? ""),
          childName: String(row.childName ?? ""),
          campus: String(row.campus ?? "International"),
          className: row.className ? String(row.className) : undefined,
          type: String(row.type ?? "absence") as RequestType,
          dateStart: String(row.dateStart ?? ""),
          dateEnd: row.dateEnd ? String(row.dateEnd) : undefined,
          time: row.time ? String(row.time) : undefined,
          note: row.note ? String(row.note) : undefined,
          changeType: row.changeType ? (String(row.changeType) as PortalRequest["changeType"]) : undefined,
          medName: row.medName ? String(row.medName) : undefined,
          teacherRead: typeof row.teacherRead === "boolean" ? row.teacherRead : undefined,
          createdAt: String(row.createdAt ?? new Date().toISOString()),
        }));
        setRequests(list);
      } catch {
        setRequests([]);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () => {
      return requests
        .filter(r => (activeTab === "all" ? true : r.type === activeTab))
        .filter(r => (campusFilter === "All" ? true : r.campus === campusFilter))
        .filter(r => {
          if (!dateFilter) return true;
          if (r.dateEnd && r.dateEnd !== r.dateStart) {
            return dateFilter >= r.dateStart && dateFilter <= r.dateEnd;
          }
          return r.dateStart === dateFilter;
        });
    },
    [requests, activeTab, campusFilter, dateFilter]
  );

  const iconFor = (t: TabType) => {
    if (t === "all") return LayoutGrid;
    return t === "absence" ? Calendar : t === "early_pickup" ? Clock : t === "bus_change" ? Bus : Pill;
  };
  const Icon = iconFor(activeTab);

  const badge = (t: TabType) =>
    t === "all"
      ? "bg-slate-800 text-white border-slate-800"
      : t === "absence"
      ? "bg-frage-blue text-white border-frage-blue"
      : t === "early_pickup"
      ? "bg-frage-green text-white border-frage-green"
      : t === "bus_change"
      ? "bg-frage-yellow text-frage-navy border-frage-yellow"
      : "bg-frage-navy text-white border-frage-navy";

  const saveNewRequest = () => {
    if (!newChildName.trim() || !newDateStart) return;
    if (newType === "early_pickup" && !newTime) return;
    if (newType === "bus_change" && !newChangeType) return;
    if (newType === "medication" && !newMedName) return;
    const id = `req_${Date.now()}`;
    const childId = newCampus === "International" ? "c1" : newCampus === "Andover" ? "c2" : "c3";
    const payload: PortalRequest = {
      id,
      childId,
      childName: newChildName.trim(),
      campus: newCampus,
      type: newType,
      dateStart: newDateStart,
      dateEnd: newType === "medication" && newDateEnd ? newDateEnd : undefined,
      time: newType === "early_pickup" ? newTime : undefined,
      changeType: newType === "bus_change" ? newChangeType : undefined,
      medName: newType === "medication" ? newMedName : undefined,
      note: newNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const insert = async () => {
      try {
        await fetch("/api/admin/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: payload.childId,
            childName: payload.childName,
            campus: payload.campus,
            type: payload.type,
            dateStart: payload.dateStart,
            dateEnd: payload.dateEnd ?? null,
            time: payload.time ?? null,
            changeType: payload.changeType ?? null,
            medName: payload.medName ?? null,
            note: payload.note ?? null,
          }),
        });
        const res = await fetch("/api/admin/requests");
        const data = await res.json();
        const rows = Array.isArray(data?.items) ? data.items : [];
        const list: PortalRequest[] = rows.map((row: any) => ({
          id: String(row.id),
          childId: String(row.childId ?? ""),
          childName: String(row.childName ?? ""),
          campus: String(row.campus ?? "International"),
          className: row.className ? String(row.className) : undefined,
          type: String(row.type ?? "absence") as RequestType,
          dateStart: String(row.dateStart ?? ""),
          dateEnd: row.dateEnd ? String(row.dateEnd) : undefined,
          time: row.time ? String(row.time) : undefined,
          note: row.note ? String(row.note) : undefined,
          changeType: row.changeType ? (String(row.changeType) as PortalRequest["changeType"]) : undefined,
          medName: row.medName ? String(row.medName) : undefined,
          teacherRead: typeof row.teacherRead === "boolean" ? row.teacherRead : undefined,
          createdAt: String(row.createdAt ?? new Date().toISOString()),
        }));
        setRequests(list);
        setActiveTab(newType);
        setCreateOpen(false);
        setNewChildName("");
        setNewDateStart("");
        setNewDateEnd("");
        setNewTime("");
        setNewChangeType("no_bus");
        setNewMedName("");
        setNewNote("");
      } catch {}
    };
    insert();
  };

  const handleCardClick = async (id: string) => {
    // Optimistic update
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, teacherRead: true } : r))
    );
    // Server update
    await supabase.from("portal_requests").update({ teacher_read: true }).eq("id", id);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-red-500" />
        <h1 className="text-2xl font-black text-slate-900">요청 관리</h1>
        </div>
        <div>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
          >
            전화 접수 추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-6">
        {(["all", "absence", "early_pickup", "bus_change", "medication"] as TabType[]).map((t) => {
          const Ico = iconFor(t);
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold ${
                activeTab === t ? badge(t) : "bg-white border-slate-200 text-slate-700"
              }`}
            >
              <Ico className="w-5 h-5" />
              {t === "all" ? "전체" : t === "absence" ? "결석" : t === "early_pickup" ? "조퇴" : t === "bus_change" ? "차량 변경" : "투약"}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">날짜</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold bg-white text-slate-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">캠퍼스</span>
          {["All", "International", "Andover", "Platz", "Atheneum"].map((c) => (
          <button
            key={c}
            onClick={() => setCampusFilter(c)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${
              campusFilter === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {c === "All" ? "전체" : c === "International" ? "국제관" : c === "Andover" ? "앤도버" : c === "Platz" ? "플라츠" : "아테네움관"}
          </button>
        ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-bold text-slate-700">
              {activeTab === "all"
                ? "전체 요청"
                : activeTab === "absence"
                ? "결석 요청"
                : activeTab === "early_pickup"
                ? "조퇴 요청"
                : activeTab === "bus_change"
                ? "차량 변경 요청"
                : "투약 요청"}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-400">{filtered.length}건</span>
        </div>
        {activeTab === "all" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">날짜</th>
                  <th className="px-4 py-3 whitespace-nowrap">시간</th>
                  <th className="px-4 py-3 whitespace-nowrap">학생</th>
                  <th className="px-4 py-3 whitespace-nowrap">캠퍼스</th>
                  <th className="px-4 py-3 whitespace-nowrap">반</th>
                  <th className="px-4 py-3 whitespace-nowrap">구분</th>
                  <th className="px-4 py-3 w-full">사유</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">해당 요청이 없습니다.</td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                      {r.dateStart}
                      {r.dateEnd && r.dateEnd !== r.dateStart && ` ~ ${r.dateEnd}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {r.time || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                      {r.childName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {r.campus === "International" ? "국제관" : r.campus === "Andover" ? "앤도버" : r.campus === "Platz" ? "플라츠" : r.campus}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {r.className || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                       <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                          r.type === "absence" ? "text-frage-blue border-frage-blue bg-blue-50" :
                          r.type === "early_pickup" ? "text-frage-green border-frage-green bg-green-50" :
                          r.type === "bus_change" ? "text-frage-yellow border-frage-yellow bg-yellow-50" :
                          "text-frage-navy border-frage-navy bg-slate-50"
                        }`}>
                          {r.type === "absence" ? "결석" : r.type === "early_pickup" ? "조퇴" : r.type === "bus_change" ? "차량" : "투약"}
                        </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.type === "bus_change" && r.changeType && (
                        <span className="mr-2 inline-block px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                          {r.changeType === "no_bus" ? "버스 없음" : r.changeType === "pickup_change" ? "픽업 변경" : "드롭오프 변경"}
                        </span>
                      )}
                      {r.type === "medication" && r.medName && (
                        <span className="mr-2 inline-block px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                          약: {r.medName}
                        </span>
                      )}
                      {r.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
        <div className="divide-y">
          {filtered.length === 0 && (
            <div className="p-6 text-sm text-slate-500">해당 요청이 없습니다.</div>
          )}
          {filtered.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
                {!r.teacherRead && (
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-1 inline-block" />
                )}
                <span className="font-bold text-slate-900">{r.childName}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full border">
                  {r.type === "bus_change"
                    ? r.changeType === "no_bus"
                      ? "버스 없음"
                      : r.changeType === "pickup_change"
                      ? "픽업 변경"
                      : "드롭오프 변경"
                    : r.type === "early_pickup"
                    ? `${r.dateStart} ${r.time || ""}`
                    : r.type === "medication"
                    ? r.medName
                    : r.dateEnd && r.dateEnd !== r.dateStart
                    ? `${r.dateStart} ~ ${r.dateEnd}`
                    : r.dateStart}
                </span>
                <span className="text-xs text-slate-500">
                  {r.campus}
                  {r.className ? ` · ${r.className}` : ""}

                </span>
                {r.type === "medication" && r.dateEnd && (
                  <span className="text-xs text-slate-500">
                    {`${r.dateStart} ~ ${r.dateEnd}`}
                  </span>
                )}
                {r.note && (
                  <span className="text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
                    <span className="font-bold mr-1">사유:</span>
                    {r.note}
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString("ko-KR")}</div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[560px] max-w-[90vw] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-slate-900">전화 접수 요청 추가</h3>
              <button onClick={() => setCreateOpen(false)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-700">캠퍼스</span>
                <select value={newCampus} onChange={(e) => setNewCampus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                  <option value="International">국제관</option>
                  <option value="Andover">앤도버</option>
                  <option value="Platz">플라츠</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-700">유형</span>
                <select value={newType} onChange={(e) => setNewType(e.target.value as RequestType)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                  <option value="absence">결석</option>
                  <option value="early_pickup">조퇴</option>
                  <option value="bus_change">차량 변경</option>
                  <option value="medication">투약</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-xs font-bold text-slate-700">학생 이름</span>
                <input value={newChildName} onChange={(e) => setNewChildName(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-700">시작 날짜</span>
                <input type="date" value={newDateStart} onChange={(e) => setNewDateStart(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
              </div>
              {newType === "medication" && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">종료 날짜</span>
                  <input type="date" value={newDateEnd} onChange={(e) => setNewDateEnd(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
              )}
              {newType === "early_pickup" && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">시간</span>
                  <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
              )}
              {newType === "bus_change" && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">변경 유형</span>
                  <select value={newChangeType} onChange={(e) => setNewChangeType(e.target.value as any)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="no_bus">버스 없음</option>
                    <option value="pickup_change">픽업 변경</option>
                    <option value="dropoff_change">드롭오프 변경</option>
                  </select>
                </div>
              )}
              {newType === "medication" && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">약명</span>
                  <input value={newMedName} onChange={(e) => setNewMedName(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
              )}
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-xs font-bold text-slate-700">사유</span>
                <input value={newNote} onChange={(e) => setNewNote(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setCreateOpen(false)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">취소</button>
              <button onClick={saveNewRequest} disabled={!newChildName || !newDateStart || (newType === "early_pickup" && !newTime) || (newType === "medication" && !newMedName)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
