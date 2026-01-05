"use client";

import { useEffect, useMemo, useState } from "react";

type ScheduleType = "수업일" | "방학" | "시험" | "행사" | "차량" | "리포트" | "공휴일";
type CalendarEvent = {
  id: string;
  title: string;
  type: ScheduleType;
  start: string;
  end: string;
  campus?: "International" | "Andover" | "Platz" | "Atheneum" | "All";
  className?: string;
  place?: string;
  exposeToParent: boolean;
  notify: boolean;
  noticeLink?: string;
  createdAt: string;
};

const monthName = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleString("ko-KR", { month: "long" });
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const pad = (n: number) => String(n).padStart(2, "0");

export default function ParentCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [campus, setCampus] = useState<string>("All");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/calendar?year=${year}&month=${month + 1}&campus=${encodeURIComponent(campus)}`, { cache: "no-store" });
        const data = await res.json();
        const items: CalendarEvent[] = Array.isArray(data?.items) ? data.items : [];
        setEvents(items);
      } catch {
        setEvents([]);
      }
    })();
  }, [year, month, campus]);

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

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      let curr = new Date(ev.start);
      const endDt = new Date(ev.end);
      let safety = 0;
      while (curr <= endDt && safety < 365) {
        const y = curr.getFullYear();
        const m = pad(curr.getMonth() + 1);
        const d = pad(curr.getDate());
        const dateStr = `${y}-${m}-${d}`;
        (map[dateStr] ||= []);
        if (!map[dateStr].find(x => x.id === ev.id)) map[dateStr].push(ev);
        curr.setDate(curr.getDate() + 1);
        safety++;
      }
    });
    return map;
  }, [events]);

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
  const goToToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <>
      <section className="bg-frage-navy pt-24 pb-16 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">Calendar</h1>
          <p className="mt-3 text-frage-sand/80">프라게의 모든 학사 일정과 교육 흐름을 한눈에 확인하세요.</p>
        </div>
      </section>
      <main className="max-w-5xl mx-auto px-4 pb-16">
      <div className="mt-6 mb-6 flex justify-center">
        <select
          value={campus}
          onChange={(e) => setCampus(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold bg-white outline-none focus:border-blue-500"
        >
          <option value="All">전체 캠퍼스</option>
          <option value="International">International</option>
          <option value="Andover">Andover</option>
          <option value="Platz">Platz</option>
          <option value="Atheneum">Atheneum</option>
        </select>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <button onClick={prevMonth} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">←</button>
          <div className="text-lg font-bold text-slate-900">{monthName(year, month)} {year}</div>
          <button onClick={nextMonth} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">→</button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-100 text-xs font-bold text-slate-500">
          {["일","월","화","수","목","금","토"].map(d => (
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
                    <button
                      key={ev.id}
                      onClick={() => setSelected(ev)}
                      className={`w-full text-left text-[11px] px-2 py-1 rounded ${ev.type === "공휴일" ? "bg-red-50 text-red-600 border border-red-100" : "bg-slate-50 text-slate-600 border border-slate-100"}`}
                    >
                      {ev.title}
                    </button>
                  ))}
                  {list.length > 3 && (
                    <div className="text-[11px] text-slate-400">+{list.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold text-slate-900">{selected.title}</div>
              <button onClick={() => setSelected(null)} className="px-3 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg">닫기</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">타입</span>
                <span className="text-slate-800 font-bold">{selected.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">기간</span>
                <span className="text-slate-800 font-bold">{selected.start} ~ {selected.end}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">장소</span>
                <span className="text-slate-800 font-bold">{selected.place || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">반</span>
                <span className="text-slate-800 font-bold">{selected.className || "-"}</span>
              </div>
              {!!selected.noticeLink && (
                <a href={selected.noticeLink} target="_blank" rel="noreferrer" className="block text-center mt-3 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">
                  공지 보기
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
