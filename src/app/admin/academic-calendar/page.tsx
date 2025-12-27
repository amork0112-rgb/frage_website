"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Plus, Filter, Bell, Eye } from "lucide-react";
import { getKoreanHolidays } from "@/lib/holidays";

type Campus = "International" | "Andover" | "Platz" | "Atheneum" | "All";
type Role = "관리자" | "교사";
type ScheduleType = "수업일" | "방학" | "시험" | "행사" | "차량" | "리포트" | "공휴일";

type CalendarEvent = {
  id: string;
  title: string;
  type: ScheduleType;
  start: string;
  end: string;
  campus?: Exclude<Campus, "All">;
  className?: string;
  place?: string;
  exposeToParent: boolean;
  notify: boolean;
  notifyDays?: number[];
  noticeLink?: string;
  createdAt: string;
};

const typeColor = (t: ScheduleType) =>
  t === "수업일"
    ? "bg-frage-blue text-white border-frage-blue"
    : t === "방학"
    ? "bg-rose-500 text-white border-rose-500"
    : t === "시험"
    ? "bg-purple-600 text-white border-purple-600"
    : t === "행사"
    ? "bg-amber-500 text-white border-amber-500"
    : t === "차량"
    ? "bg-teal-600 text-white border-teal-600"
    : t === "공휴일"
    ? "bg-red-600 text-white border-red-600"
    : "bg-slate-900 text-white border-slate-900";

const typeDot = (t: ScheduleType) =>
  t === "수업일"
    ? "bg-frage-blue"
    : t === "방학"
    ? "bg-rose-500"
    : t === "시험"
    ? "bg-purple-600"
    : t === "행사"
    ? "bg-amber-500"
    : t === "차량"
    ? "bg-teal-600"
    : t === "공휴일"
    ? "bg-red-600"
    : "bg-slate-900";

export default function AdminAcademicCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [campusFilter, setCampusFilter] = useState<Campus>("All");
  const [typeFilter, setTypeFilter] = useState<ScheduleType | "All">("All");
  const [panelDate, setPanelDate] = useState<string | null>(null);
  const [annualView, setAnnualView] = useState(false);
  const [holidayImported, setHolidayImported] = useState(false);
  const [toast, setToast] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkProgress, setBulkProgress] = useState<{ total: number; processed: number }>({ total: 0, processed: 0 });
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [holidayError, setHolidayError] = useState("");

  const fetchHolidaysFromAPI = async (y: number): Promise<{ date: string; name: string }[]> => {
    const apiKey = process.env.NEXT_PUBLIC_MOIS_API_KEY;
    if (!apiKey) throw new Error("__NO_KEY__");
    const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo?solYear=${y}&ServiceKey=${apiKey}&_type=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("공휴일 API 호출 실패");
    const txt = await res.text();
    try {
      const j = JSON.parse(txt) as any;
      const items = j?.response?.body?.items?.item;
      if (!items) throw new Error("공휴일 데이터가 없습니다");
      const arr = Array.isArray(items) ? items : [items];
      return arr
        .map((it: any) => {
          const loc = String(it?.locdate || "");
          const nm = String(it?.dateName || "");
          if (loc.length !== 8 || !nm) return null;
          const d = `${loc.slice(0, 4)}-${loc.slice(4, 6)}-${loc.slice(6, 8)}`;
          return { date: d, name: nm };
        })
        .filter(Boolean) as { date: string; name: string }[];
    } catch {
      // XML fallback
      const locdates = Array.from(txt.matchAll(/<locdate>(\d{8})<\/locdate>/g)).map(m => m[1]);
      const names = Array.from(txt.matchAll(/<dateName>([^<]+)<\/dateName>/g)).map(m => m[1]);
      if (locdates.length === 0 || names.length === 0) throw new Error("공휴일 데이터 파싱 실패");
      const out: { date: string; name: string }[] = [];
      for (let i = 0; i < Math.min(locdates.length, names.length); i++) {
        const loc = locdates[i];
        const nm = names[i];
        const d = `${loc.slice(0, 4)}-${loc.slice(4, 6)}-${loc.slice(6, 8)}`;
        out.push({ date: d, name: nm });
      }
      return out;
    }
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ScheduleType>("수업일");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newCampus, setNewCampus] = useState<Exclude<Campus, "All">>("International");
  const [newClass, setNewClass] = useState("");
  const [newExpose, setNewExpose] = useState(true);
  const [newNotify, setNewNotify] = useState(false);
  const [newNotifyDays, setNewNotifyDays] = useState<number[]>([]);
  const [newNoticeLink, setNewNoticeLink] = useState("");

  const [role, setRole] = useState<Role>("관리자");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin_calendar_events");
      const list = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(list) ? list : [];
      const uniq = (() => {
        const m = new Map<string, CalendarEvent>();
        arr.forEach((e) => {
          if (!m.has(e.id)) m.set(e.id, e);
        });
        return Array.from(m.values());
      })();
      setEvents(uniq);
      const hasYearHoliday =
        uniq.some((e) => typeof e?.start === "string" && e.start.startsWith(String(year)) && e?.type === "공휴일");
      const flag = localStorage.getItem(`holiday_imported_${year}`) === "1";
      setHolidayImported(hasYearHoliday || flag);
    } catch {
      setEvents([]);
    }
    try {
      const r = localStorage.getItem("admin_role");
      setRole(r === "teacher" ? "교사" : "관리자");
    } catch {}
    (async () => {
      try {
        const rawCache = localStorage.getItem(`holiday_cache_${year}`);
        if (rawCache) {
          const cached: { date: string; name: string }[] = JSON.parse(rawCache);
          if (Array.isArray(cached) && cached.length > 0) {
            const payloads = cached.map(h => ({
              id: `holiday_${h.name}_${h.date}`,
              title: h.name,
              type: "공휴일" as ScheduleType,
              start: h.date,
              end: h.date,
              campus: undefined,
              className: undefined,
              exposeToParent: true,
              notify: false,
              notifyDays: [],
              noticeLink: undefined,
              createdAt: new Date().toISOString()
            }));
            const next = [...payloads, ...events];
            const uniq = (() => {
              const m = new Map<string, CalendarEvent>();
              next.forEach((e) => {
                if (!m.has(e.id)) m.set(e.id, e);
              });
              return Array.from(m.values());
            })();
            setEvents(uniq);
            setHolidayImported(true);
            return;
          }
        }
        setHolidayLoading(true);
        setHolidayError("");
        try {
          const apiData = await fetchHolidaysFromAPI(year);
          localStorage.setItem(`holiday_cache_${year}`, JSON.stringify(apiData));
          localStorage.setItem(`holiday_imported_${year}`, "1");
          const payloads = apiData.map(h => ({
            id: `holiday_${h.name}_${h.date}`,
            title: h.name,
            type: "공휴일" as ScheduleType,
            start: h.date,
            end: h.date,
            campus: undefined,
            className: undefined,
            exposeToParent: true,
            notify: false,
            notifyDays: [],
            noticeLink: undefined,
            createdAt: new Date().toISOString()
          }));
          setEvents(prev => [...payloads, ...prev]);
          setEvents(prev => {
            const next = [...prev];
            const m = new Map<string, CalendarEvent>();
            next.forEach((e) => {
              if (!m.has(e.id)) m.set(e.id, e);
            });
            return Array.from(m.values());
          });
          setHolidayImported(true);
        } catch (e: any) {
          // Fallback to local mapping
          const hs = getKoreanHolidays(year);
          const cache = hs.map(h => ({ date: h.start, name: h.title }));
          localStorage.setItem(`holiday_cache_${year}`, JSON.stringify(cache));
          localStorage.setItem(`holiday_imported_${year}`, "1");
          const payloads = hs.map(h => ({
            id: `holiday_${h.title}_${h.start}`,
            title: h.title,
            type: "공휴일" as ScheduleType,
            start: h.start,
            end: h.end,
            campus: undefined,
            className: undefined,
            exposeToParent: true,
            notify: false,
            notifyDays: [],
            noticeLink: undefined,
            createdAt: new Date().toISOString()
          }));
          setEvents(prev => {
            const next = [...payloads, ...prev];
            const m = new Map<string, CalendarEvent>();
            next.forEach((e) => {
              if (!m.has(e.id)) m.set(e.id, e);
            });
            return Array.from(m.values());
          });
          setHolidayImported(true);
          const hasKey = !!process.env.NEXT_PUBLIC_MOIS_API_KEY;
          const msg = String(e?.message || "");
          if (hasKey && msg !== "__NO_KEY__") {
            setHolidayError("공휴일 데이터를 공식 API에서 가져오지 못했습니다. 로컬 기준으로 표시합니다.");
          } else {
            setHolidayError("");
          }
        } finally {
          setHolidayLoading(false);
        }
      } catch {
        setHolidayLoading(false);
      }
    })();
  }, []);

  const canEdit = useMemo(() => {
    return role !== "교사";
  }, [role]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (campusFilter !== "All" && e.campus && e.campus !== campusFilter) return false;
      if (typeFilter !== "All" && e.type !== typeFilter) return false;
      return true;
    });
  }, [events, campusFilter, typeFilter]);

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y: number, m: number) => new Date(y, m, 1).getDay();
  const dateKey = (d: Date) => d.toISOString().split("T")[0];
  const ymKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;
  const formatDate = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach(e => {
      const s = new Date(e.start);
      const en = new Date(e.end || e.start);
      const cur = new Date(s);
      while (cur <= en) {
        const k = dateKey(cur);
        const list = map[k] || [];
        list.push(e);
        map[k] = list;
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [filteredEvents]);

  const saveEvent = () => {
    if (!newTitle.trim() || !newStart || !newEnd) return;
    if (!canEdit) return;
    const payload: CalendarEvent = {
      id: `ev_${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      start: newStart,
      end: newEnd,
      campus: newCampus,
      className: newClass.trim() || undefined,
      exposeToParent: newExpose,
      notify: newNotify,
      notifyDays: newNotify ? newNotifyDays : [],
      noticeLink: newNoticeLink.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem("admin_calendar_events");
      const list = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(list) ? [payload, ...list] : [payload];
      localStorage.setItem("admin_calendar_events", JSON.stringify(next));
      setEvents(next);
      setCreateOpen(false);
      setNewTitle("");
      setNewStart("");
      setNewEnd("");
      setNewClass("");
      setNewExpose(true);
      setNewNotify(false);
      setNewNotifyDays([]);
      setNewNoticeLink("");
    } catch {}
  };

  const removeEvent = (id: string) => {
    if (!canEdit) return;
    const next = events.filter(e => e.id !== id);
    try {
      localStorage.setItem("admin_calendar_events", JSON.stringify(next));
      setEvents(next);
    } catch {}
  };

  const months = Array.from({ length: 12 }, (_, i) => i);

  const MonthGrid = ({ y, m }: { y: number; m: number }) => {
    const dim = daysInMonth(y, m);
    const fd = firstDay(y, m);
    const pads: (number | null)[] = Array(fd).fill(null);
    const days: (number | null)[] = Array.from({ length: dim }, (_, i) => i + 1);
    const cells: (number | null)[] = [...pads, ...days];
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-frage-blue" />
            <h3 className="font-bold text-slate-900">{y}년 {m + 1}월</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(m)}
              className="text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              보기
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-200">
          {["일","월","화","수","목","금","토"].map(d => (
            <div key={d} className="bg-slate-50 text-xs font-bold text-slate-600 px-2 py-2">{d}</div>
          ))}
          {cells.map((c, idx) => {
            const key = c ? formatDate(y, m, c) : `${y}-${m}-pad-${idx}`;
            const dayEvents = c ? (eventsByDate[key] || []) : [];
            return (
              <button
                key={key}
                onClick={() => c && setPanelDate(key)}
                className={`bg-white min-h-[90px] px-2 py-2 text-left ${c ? "hover:bg-slate-50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{c || ""}</span>
                  {c && dayEvents.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {dayEvents.slice(0, 2).map(e => (
                    <div key={e.id} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${typeDot(e.type)}`}></span>
                      <span className="text-[11px] text-slate-700 truncate">{e.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-slate-500">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const panelItems = panelDate ? eventsByDate[panelDate] || [] : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-frage-blue" />
          <h1 className="text-2xl font-black text-slate-900">학사일정 캘린더</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnnualView(v => !v)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-sm"
          >
            {annualView ? "월간 보기" : "연간 보기"}
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            disabled={!canEdit}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-frage-blue text-white bg-frage-blue hover:bg-frage-navy text-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            일정 추가
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            disabled={!canEdit}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm disabled:opacity-50"
          >
            일괄 추가
          </button>
        </div>
      </div>
      {holidayLoading && (
        <div className="mb-4 text-center">
          <span className="inline-block px-3 py-2 rounded-full bg-slate-100 text-slate-700 text-xs">
            공휴일 불러오는 중...
          </span>
        </div>
      )}
      {holidayError && (
        <div className="mb-4 text-center">
          <span className="inline-block px-3 py-2 rounded-full bg-rose-100 text-rose-700 text-xs">
            {holidayError}
          </span>
        </div>
      )}
      {toast && (
        <div className="mb-4 text-center">
          <span className="inline-block px-3 py-2 rounded-full bg-slate-800 text-white text-xs">{toast}</span>
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-2 text-sm text-slate-600">
              <Filter className="w-4 h-4" /> 필터
            </span>
            <select
              value={campusFilter}
              onChange={e => setCampusFilter(e.target.value as Campus)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
            >
              <option value="All">전체 캠퍼스</option>
              <option value="International">국제관</option>
              <option value="Andover">앤도버관</option>
              <option value="Platz">플라츠관</option>
              <option value="Atheneum">아테네움관</option>
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as ScheduleType | "All")}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
            >
              <option value="All">전체 타입</option>
              <option value="수업일">수업일</option>
              <option value="방학">방학</option>
              <option value="시험">시험</option>
              <option value="행사">행사</option>
              <option value="차량">차량 관련 일정</option>
              <option value="리포트">리포트 일정</option>
            </select>
            {!canEdit && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                읽기 전용
              </span>
            )}
          </div>

          {!annualView && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const d = new Date(year, month - 1, 1);
                    setYear(d.getFullYear());
                    setMonth(d.getMonth());
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm"
                >
                  이전
                </button>
                <div className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm">
                  {year}년 {month + 1}월
                </div>
                <button
                  onClick={() => {
                    const d = new Date(year, month + 1, 1);
                    setYear(d.getFullYear());
                    setMonth(d.getMonth());
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {!annualView ? (
            <MonthGrid y={year} m={month} />
          ) : (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {months.map(m => (
                <MonthGrid key={ymKey(year, m)} y={year} m={m} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              {panelDate ? panelDate : "날짜 선택"}
            </h3>
            <button
              onClick={() => setPanelDate(null)}
              className="text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              닫기
            </button>
          </div>
          <div className="p-4 space-y-3">
            {panelItems.length === 0 ? (
              <div className="text-sm text-slate-500">선택한 날짜의 일정이 없습니다.</div>
            ) : (
              panelItems.map(e => (
                <div key={e.id} className="border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeColor(e.type)}`}>
                        {e.type}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{e.title}</span>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => removeEvent(e.id)}
                        className="text-xs px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    {e.start} ~ {e.end}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {e.campus && <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">{e.campus}</span>}
                    {e.className && <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">{e.className}</span>}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${e.exposeToParent ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                      <Eye className="w-3 h-3" /> {e.exposeToParent ? "학부모 노출" : "내부"}
                    </span>
                    {e.notify && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700">
                        <Bell className="w-3 h-3" /> 알림: {e.notifyDays?.join(", ")}일 전
                      </span>
                    )}
                    {e.type === "차량" && (
                      <span className="px-2 py-1 rounded bg-teal-50 text-teal-700">차량 영향</span>
                    )}
                    {e.type === "리포트" && (
                      <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700">리포트 기준일</span>
                    )}
                  </div>
                  {e.noticeLink && (
                    <div className="mt-2 text-xs">
                      <a href={e.noticeLink} target="_blank" rel="noreferrer" className="text-frage-blue hover:underline">
                        공지 연결
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-[1200]">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">일정 추가</h3>
            <div className="space-y-3">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="제목"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as ScheduleType)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                >
                  <option value="수업일">수업일</option>
                  <option value="방학">방학</option>
                  <option value="시험">시험</option>
                  <option value="행사">행사</option>
                  <option value="차량">차량 관련 일정</option>
                  <option value="리포트">리포트 일정</option>
                  <option value="공휴일">공휴일</option>
                </select>
                <select
                  value={newCampus}
                  onChange={e => setNewCampus(e.target.value as Exclude<Campus, "All">)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                >
                  <option value="International">국제관</option>
                  <option value="Andover">앤도버관</option>
                  <option value="Platz">플라츠관</option>
                  <option value="Atheneum">아테네움관</option>
                </select>
              </div>
              <input
                value={newClass}
                onChange={e => setNewClass(e.target.value)}
                placeholder="반 (선택)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              />
              <input
                value={newNoticeLink}
                onChange={e => setNewNoticeLink(e.target.value)}
                placeholder="공지 링크 (선택)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={newStart}
                  onChange={e => setNewStart(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                />
                <input
                  type="date"
                  value={newEnd}
                  onChange={e => setNewEnd(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newExpose}
                    onChange={e => setNewExpose(e.target.checked)}
                  />
                  학부모 노출
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newNotify}
                    onChange={e => setNewNotify(e.target.checked)}
                  />
                  알림 발송
                </label>
              </div>
              {newNotify && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setNewNotifyDays(d => (d.includes(7) ? d.filter(x => x !== 7) : [...d, 7]))
                    }
                    className={`px-3 py-2 rounded-xl border text-sm ${
                      newNotifyDays.includes(7)
                        ? "bg-amber-100 border-amber-200 text-amber-700"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    7일 전
                  </button>
                  <button
                    onClick={() =>
                      setNewNotifyDays(d => (d.includes(1) ? d.filter(x => x !== 1) : [...d, 1]))
                    }
                    className={`px-3 py-2 rounded-xl border text-sm ${
                      newNotifyDays.includes(1)
                        ? "bg-amber-100 border-amber-200 text-amber-700"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    1일 전
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-sm"
                >
                  취소
                </button>
                <button
                  onClick={saveEvent}
                  disabled={!canEdit}
                  className="px-3 py-2 rounded-xl border border-frage-blue text-white bg-frage-blue hover:bg-frage-navy text-sm disabled:opacity-50"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-[1200]">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">일정 일괄 추가</h3>
            <p className="text-xs text-slate-600 mb-4">
              각 줄에 한 개의 일정을 입력하세요. 구분자는 쉼표입니다.
              형식: 제목,타입,시작일,종료일,캠퍼스,반,장소,학부모노출(true/false),알림(true/false),알림일(예: 7|1)
            </p>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="file"
                accept=".csv,text/plain"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setBulkText(String(reader.result || ""));
                  };
                  reader.readAsText(f);
                }}
              />
              <button
                onClick={() => {
                  const sample =
                    "중간고사,시험,2026-05-12,2026-05-12,International,Grade 3,본관,true,false,\n" +
                    "어린이날 행사,행사,2026-05-05,2026-05-05,Platz,Grade 2,체육관,true,true,1\n" +
                    "여름방학,방학,2026-07-22,2026-08-18,International,,전체,true,false,";
                  setBulkText(sample);
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-sm"
              >
                샘플 넣기
              </button>
            </div>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-mono"
              placeholder="제목,타입,시작일(YYYY-MM-DD),종료일(YYYY-MM-DD),캠퍼스,반,장소,학부모노출,알림,알림일"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-slate-600">
                진행: {bulkProgress.processed}/{bulkProgress.total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBulkOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-sm"
                >
                  닫기
                </button>
                <button
                  disabled={!canEdit}
                  onClick={() => {
                    const lines = bulkText
                      .split(/\r?\n/)
                      .map(l => l.trim())
                      .filter(l => l.length > 0);
                    setBulkProgress({ total: lines.length, processed: 0 });
                    const errors: string[] = [];
                    const payloads: CalendarEvent[] = [];
                    const validCampus: Exclude<Campus, "All">[] = ["International", "Andover", "Platz", "Atheneum"];
                    for (let i = 0; i < lines.length; i++) {
                      const raw = lines[i];
                      const parts = raw.split(",").map(s => s.trim());
                      const [
                        pTitle,
                        pType,
                        pStart,
                        pEnd,
                        pCampus,
                        pClass,
                        pPlace,
                        pExpose,
                        pNotify,
                        pDays
                      ] = [
                        parts[0] || "",
                        parts[1] || "",
                        parts[2] || "",
                        parts[3] || "",
                        parts[4] || "",
                        parts[5] || "",
                        parts[6] || "",
                        parts[7] || "",
                        parts[8] || "",
                        parts[9] || ""
                      ];
                      const idx = i + 1;
                      if (!pTitle || !pStart || !pEnd) {
                        errors.push(`${idx}행: 제목/시작일/종료일은 필수입니다.`);
                        continue;
                      }
                      const sDate = new Date(pStart);
                      const eDate = new Date(pEnd);
                      if (Number.isNaN(sDate.getTime()) || Number.isNaN(eDate.getTime())) {
                        errors.push(`${idx}행: 날짜 형식 오류(YYYY-MM-DD).`);
                        continue;
                      }
                      let t: ScheduleType =
                        pType === "방학" || pType === "시험" || pType === "행사" || pType === "차량" || pType === "리포트" || pType === "공휴일"
                          ? (pType as ScheduleType)
                          : "수업일";
                      let c: Exclude<Campus, "All"> | undefined = undefined;
                      if (pCampus) {
                        if (!validCampus.includes(pCampus as any)) {
                          errors.push(`${idx}행: 캠퍼스 값 오류(International/Andover/Platz/Atheneum).`);
                          continue;
                        }
                        c = pCampus as Exclude<Campus, "All">;
                      }
                      const expose = pExpose ? pExpose.toLowerCase() === "true" : true;
                      const notify = pNotify ? pNotify.toLowerCase() === "true" : false;
                      const days =
                        notify && pDays
                          ? pDays
                              .split("|")
                              .map(s => Number(s))
                              .filter(n => !Number.isNaN(n))
                          : [];
                      payloads.push({
                        id: `bulk_${Date.now()}_${idx}`,
                        title: pTitle,
                        type: t,
                        start: pStart,
                        end: pEnd,
                        campus: c,
                        className: pClass || undefined,
                        place: pPlace || undefined,
                        exposeToParent: expose,
                        notify,
                        notifyDays: days,
                        createdAt: new Date().toISOString()
                      });
                      setBulkProgress(prev => ({ total: prev.total, processed: prev.processed + 1 }));
                    }
                    setBulkErrors(errors);
                    if (errors.length > 0) {
                      setToast(`오류: ${errors.length}건`);
                      setTimeout(() => setToast(""), 2000);
                      return;
                    }
                    const next = [...payloads, ...events];
                    try {
                      localStorage.setItem("admin_calendar_events", JSON.stringify(next));
                    } catch {}
                    setEvents(next);
                    setToast(`일괄 추가 완료: ${payloads.length}건`);
                    setTimeout(() => setToast(""), 2000);
                  }}
                  className="px-3 py-2 rounded-xl border border-frage-blue text-white bg-frage-blue hover:bg-frage-navy text-sm disabled:opacity-50"
                >
                  추가
                </button>
              </div>
            </div>
            {bulkErrors.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-bold text-rose-600 mb-2">오류 목록</h4>
                <div className="max-h-40 overflow-y-auto border border-rose-200 rounded-xl p-3 text-xs text-rose-700 bg-rose-50">
                  {bulkErrors.map((e, i) => (
                    <div key={`${e}-${i}`}>{e}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
