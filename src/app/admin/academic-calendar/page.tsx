"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getKoreanHolidays } from "@/lib/holidays";
import type { HolidayEvent } from "@/lib/holidays";

type ScheduleType = "수업일" | "방학" | "시험" | "행사" | "차량" | "리포트" | "공휴일";
type CalendarEvent = {
  id: string;
  title: string;
  type: ScheduleType;
  start: string;
  end: string;
  campus?: "International" | "Andover" | "Platz" | "Atheneum";
  className?: string;
  place?: string;
  exposeToParent: boolean;
  notify: boolean;
  notifyDays?: number[];
  noticeLink?: string;
  createdAt: string;
};

const monthName = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleString("en-US", { month: "long" });
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const pad = (n: number) => String(n).padStart(2, "0");

export default function AdminAcademicCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ScheduleType>("행사");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [campus, setCampus] = useState<CalendarEvent["campus"]>();
  const [className, setClassName] = useState<string>("");
  const [place, setPlace] = useState<string>("");
  const [exposeToParent, setExposeToParent] = useState<boolean>(true);
  const [notify, setNotify] = useState<boolean>(false);
  const [noticeLink, setNoticeLink] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin_calendar_events");
      const list = raw ? JSON.parse(raw) : [];
      setEvents(Array.isArray(list) ? list : []);
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    try {
      const y = year;
      const hol: HolidayEvent[] = getKoreanHolidays(y);
      const monthStr = `${y}-${pad(month + 1)}`;
      const monthHolidays = hol.filter((h: HolidayEvent) => h.start.startsWith(monthStr));
      const raw = localStorage.getItem("admin_calendar_events");
      const list: CalendarEvent[] = raw ? JSON.parse(raw) : [];
      const exists = new Set(list.filter(e => e.type === "공휴일").map(e => `${e.title}|${e.start}`));
      const toAdd = monthHolidays.filter((h: HolidayEvent) => !exists.has(`${h.title}|${h.start}`)).map((h: HolidayEvent) => ({
        id: `ev_${h.title}_${h.start}`,
        title: h.title,
        type: "공휴일" as ScheduleType,
        start: h.start,
        end: h.end,
        exposeToParent: h.exposeToParent,
        notify: false,
        createdAt: new Date().toISOString()
      })) as CalendarEvent[];
      if (toAdd.length > 0) {
        const merged = [...toAdd, ...(Array.isArray(list) ? list : [])];
        localStorage.setItem("admin_calendar_events", JSON.stringify(merged));
        setEvents(merged);
      }
    } catch {}
  }, [year, month]);

  const monthDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const total = daysInMonth(year, month);
    const prevMonthDays = daysInMonth(year, month - 1);
    const cells: { label: string; dateStr: string; outside: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      const d = prevMonthDays - startWeekday + i + 1;
      const dateStr = `${year}-${pad(month)}-${pad(d)}`;
      cells.push({ label: String(d), dateStr, outside: true });
    }
    for (let d = 1; d <= total; d++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      cells.push({ label: String(d), dateStr, outside: false });
    }
    while (cells.length % 7 !== 0) {
      const nextIdx = cells.length - total - startWeekday + 1;
      const d = nextIdx;
      const dateStr = `${year}-${pad(month + 2)}-${pad(d)}`;
      cells.push({ label: String(d), dateStr, outside: true });
    }
    return cells;
  }, [year, month]);

  const monthStr = `${year}-${pad(month + 1)}`;
  const monthEvents = useMemo(() => {
    return events.filter(ev => ev.start.startsWith(monthStr)).sort((a, b) => a.start.localeCompare(b.start));
  }, [events, monthStr]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    monthEvents.forEach(ev => {
      const k = ev.start;
      if (!map[k]) map[k] = [];
      map[k].push(ev);
    });
    return map;
  }, [monthEvents]);

  const addEvent = () => {
    const s = (start || "").trim();
    const e = (end || "").trim();
    const t = title.trim();
    if (!t || !s || !e) return;
    const item: CalendarEvent = {
      id: `ev_${Date.now()}`,
      title: t,
      type,
      start: s,
      end: e,
      campus,
      className: className || undefined,
      place: place || undefined,
      exposeToParent,
      notify,
      noticeLink: noticeLink || undefined,
      createdAt: new Date().toISOString()
    };
    const next = [item, ...events];
    setEvents(next);
    try {
      localStorage.setItem("admin_calendar_events", JSON.stringify(next));
      setTitle("");
      setStart("");
      setEnd("");
      setCampus(undefined);
      setClassName("");
      setPlace("");
      setExposeToParent(true);
      setNotify(false);
      setNoticeLink("");
      alert("일정이 추가되었습니다.");
    } catch {}
  };

  const prevMonth = () => {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() - 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900">학사 캘린더</h1>
        </div>
        <Link href="/admin/home" className="text-sm font-bold text-slate-700 underline underline-offset-4">대시보드</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <section className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <button onClick={prevMonth} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">←</button>
            <div className="text-lg font-bold text-slate-900">{monthName(year, month)} {year}</div>
            <button onClick={nextMonth} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">→</button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-100 text-xs font-bold text-slate-500">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} className="bg-white p-2 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-slate-100">
            {monthDays.map(cell => {
              const list = eventsByDay[cell.dateStr] || [];
              return (
                <div key={cell.dateStr} className={`bg-white min-h-24 p-2 ${cell.outside ? "bg-slate-50 text-slate-400" : ""}`}>
                  <div className="text-xs font-bold">{cell.label}</div>
                  <div className="mt-1 space-y-1">
                    {list.slice(0, 3).map(ev => (
                      <div key={ev.id} className={`text-[11px] px-2 py-1 rounded ${ev.type === "공휴일" ? "bg-red-50 text-red-600 border border-red-100" : "bg-slate-50 text-slate-600 border border-slate-100"}`}>
                        {ev.title}
                      </div>
                    ))}
                    {list.length > 3 && (
                      <div className="text-[11px] text-slate-400">+{list.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="text-lg font-bold text-slate-900 mb-3">일정 추가</div>
          <div className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
            <select value={type} onChange={(e) => setType(e.target.value as ScheduleType)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="수업일">수업일</option>
              <option value="방학">방학</option>
              <option value="시험">시험</option>
              <option value="행사">행사</option>
              <option value="차량">차량</option>
              <option value="리포트">리포트</option>
              <option value="공휴일">공휴일</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={campus || ""} onChange={(e) => setCampus((e.target.value || "") as any)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value="">캠퍼스 선택</option>
                <option value="International">International</option>
                <option value="Andover">Andover</option>
                <option value="Platz">Platz</option>
                <option value="Atheneum">Atheneum</option>
              </select>
              <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="반 이름(선택)" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
            </div>
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="장소(선택)" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
            <input value={noticeLink} onChange={(e) => setNoticeLink(e.target.value)} placeholder="공지 링크(선택)" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={exposeToParent} onChange={(e) => setExposeToParent(e.target.checked)} />
                학부모에게 공개
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                알림 발송
              </label>
            </div>
            <button onClick={addEvent} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">추가</button>
          </div>
          <div className="text-xs text-slate-500 mt-3">
            현재 월의 공휴일은 자동으로 추가됩니다.
          </div>
        </section>
      </div>
    </main>
  );
}
