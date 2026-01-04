"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Calendar, Clock, Bus, Pill, Users, Bell, AlertCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

type RequestType = "absence" | "early_pickup" | "bus_change" | "medication";

type PortalRequest = {
  id: string;
  childId: string;
  childName: string;
  campus: string;
  type: RequestType;
  dateStart: string;
  dateEnd?: string;
  time?: string;
  note?: string;
  changeType?: "no_bus" | "pickup_change" | "dropoff_change";
  medName?: string;
  createdAt: string;
};

export default function AdminRequestsPage() {
  const [activeTab, setActiveTab] = useState<RequestType>("absence");
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [campusFilter, setCampusFilter] = useState<string>("All");
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
        const { data } = await supabase
          .from("portal_requests")
          .select("*")
          .order("created_at", { ascending: false });
        const list: PortalRequest[] = Array.isArray(data)
          ? data.map((row: any) => ({
              id: String(row.id),
              childId: String(row.child_id ?? ""),
              childName: String(row.child_name ?? ""),
              campus: String(row.campus ?? "International"),
              type: String(row.type ?? "absence") as RequestType,
              dateStart: String(row.date_start ?? ""),
              dateEnd: row.date_end ? String(row.date_end) : undefined,
              time: row.time ? String(row.time) : undefined,
              note: row.note ? String(row.note) : undefined,
              changeType: row.change_type ? (String(row.change_type) as PortalRequest["changeType"]) : undefined,
              medName: row.med_name ? String(row.med_name) : undefined,
              createdAt: String(row.created_at ?? new Date().toISOString()),
            }))
          : [];
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
        .filter(r => r.type === activeTab)
        .filter(r => (campusFilter === "All" ? true : r.campus === campusFilter));
    },
    [requests, activeTab, campusFilter]
  );

  const iconFor = (t: RequestType) =>
    t === "absence" ? Calendar : t === "early_pickup" ? Clock : t === "bus_change" ? Bus : Pill;
  const Icon = iconFor(activeTab);

  const badge = (t: RequestType) =>
    t === "absence"
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
        await supabase.from("portal_requests").insert({
          id: payload.id,
          child_id: payload.childId,
          child_name: payload.childName,
          campus: payload.campus,
          type: payload.type,
          date_start: payload.dateStart,
          date_end: payload.dateEnd ?? null,
          time: payload.time ?? null,
          change_type: payload.changeType ?? null,
          med_name: payload.medName ?? null,
          note: payload.note ?? null,
          created_at: payload.createdAt,
        });
        const { data } = await supabase
          .from("portal_requests")
          .select("*")
          .order("created_at", { ascending: false });
        const list: PortalRequest[] = Array.isArray(data)
          ? data.map((row: any) => ({
              id: String(row.id),
              childId: String(row.child_id ?? ""),
              childName: String(row.child_name ?? ""),
              campus: String(row.campus ?? "International"),
              type: String(row.type ?? "absence") as RequestType,
              dateStart: String(row.date_start ?? ""),
              dateEnd: row.date_end ? String(row.date_end) : undefined,
              time: row.time ? String(row.time) : undefined,
              note: row.note ? String(row.note) : undefined,
              changeType: row.change_type ? (String(row.change_type) as PortalRequest["changeType"]) : undefined,
              medName: row.med_name ? String(row.med_name) : undefined,
              createdAt: String(row.created_at ?? new Date().toISOString()),
            }))
          : [];
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
      } catch {
      }
    };
    insert();
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

      <div className="grid grid-cols-4 gap-2 mb-6">
        {(["absence", "early_pickup", "bus_change", "medication"] as RequestType[]).map((t) => {
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
              {t === "absence" ? "결석" : t === "early_pickup" ? "조퇴" : t === "bus_change" ? "차량 변경" : "투약"}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-bold text-slate-700">
              {activeTab === "absence"
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
        <div className="divide-y">
          {filtered.length === 0 && (
            <div className="p-6 text-sm text-slate-500">해당 요청이 없습니다.</div>
          )}
          {filtered.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{r.childName}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border">
                    {activeTab === "bus_change"
                      ? r.changeType === "no_bus"
                        ? "버스 없음"
                        : r.changeType === "pickup_change"
                        ? "픽업 변경"
                        : "드롭오프 변경"
                      : activeTab === "early_pickup"
                      ? r.time
                      : activeTab === "medication"
                      ? r.medName
                      : r.dateStart}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {activeTab === "medication" && r.dateEnd
                    ? `${r.dateStart} ~ ${r.dateEnd}`
                    : r.dateStart}
                </div>
                {r.note && <div className="text-xs text-slate-600">{r.note}</div>}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString("ko-KR")}</div>
              </div>
            </div>
          ))}
        </div>
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
                <span className="text-xs font-bold text-slate-700">메모</span>
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
