// src/app/academic-calendar/page.tsx
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
  noticeLink?: string;
};

const toDateStr = (s: string) => String(s).slice(0, 10);
const normalizeType = (t: string): ScheduleType => {
  const allowed: ScheduleType[] = ["수업일","방학","시험","행사","차량","리포트","공휴일"];
  return allowed.includes(t as ScheduleType) ? (t as ScheduleType) : "행사";
};

const TYPE_STYLE: Record<ScheduleType, string> = {
  수업일: "bg-slate-100 text-slate-700 border border-slate-200",
  방학: "bg-green-50 text-green-700 border border-green-100",
  시험: "bg-red-50 text-red-600 border border-red-100",
  행사: "bg-blue-50 text-blue-700 border border-blue-100",
  차량: "bg-amber-50 text-amber-700 border border-amber-100",
  리포트: "bg-purple-50 text-purple-700 border border-purple-100",
  공휴일: "bg-rose-50 text-rose-600 border border-rose-100",
};

const monthName = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleString("ko-KR", { month: "long" });
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const pad = (n: number) => String(n).padStart(2, "0");

export default function AcademicCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/calendar?year=${year}&month=${month + 1}`, { cache: "no-store" });
        const data = await res.json();
        const items: CalendarEvent[] = Array.isArray(data?.items)
          ? data.items.map((r: any) => ({
              id: String(r.id),
              title: String(r.title || ""),
              type: normalizeType(String(r.type || "")),
              start: toDateStr(r.start),
              end: toDateStr(r.end || r.start),
              campus: r.campus ? String(r.campus) as any : undefined,
              className: r.className ? String(r.className) : undefined,
              place: r.place ? String(r.place) : undefined,
              noticeLink: r.noticeLink ? String(r.noticeLink) : undefined,
            }))
          : [];
        setEvents(items);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [year, month]);

  const monthDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const total = daysInMonth(year, month);
    const prevMonthDays = daysInMonth(year, month - 1);
    const cells: { label: string; dateStr: string; outside: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      const d = prevMonthDays - startWeekday + i + 1;
      const prev = new Date(year, month, d);
      const dateStr = prev.toISOString().slice(0, 10);
      cells.push({ label: String(d), dateStr, outside: true });
    }
    for (let d = 1; d <= total; d++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      cells.push({ label: String(d), dateStr, outside: false });
    }
    while (cells.length % 7 !== 0) {
      const nextIdx = cells.length - total - startWeekday + 1;
      const d = nextIdx;
      const next = new Date(year, month + 1, d);
      const dateStr = next.toISOString().slice(0, 10);
      cells.push({ label: String(d), dateStr, outside: true });
    }
    return cells;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      if (ev.start === ev.end) {
        const dateStr = toDateStr(ev.start);
        (map[dateStr] ||= []);
        if (!map[dateStr].find(x => x.id === ev.id)) {
          map[dateStr].push(ev);
        }
      }
    });
    return map;
  }, [events]);

  const weeks = useMemo(() => {
    const arr: typeof monthDays[] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      arr.push(monthDays.slice(i, i + 7));
    }
    return arr;
  }, [monthDays]);

  const weekBars = useMemo(() => {
    const bars: { weekIdx: number; ev: CalendarEvent; startCol: number; span: number }[] = [];
    weeks.forEach((week, wi) => {
      const visibleIdxs = week.map((c, idx) => (!c.outside ? idx : -1)).filter(idx => idx >= 0);
      if (!visibleIdxs.length) return;
      const visStartIdx = visibleIdxs[0];
      const visEndIdx = visibleIdxs[visibleIdxs.length - 1];
      const visStartDate = week[visStartIdx]?.dateStr;
      const visEndDate = week[visEndIdx]?.dateStr;
      if (!visStartDate || !visEndDate) return;
      events.forEach(ev => {
        const s = toDateStr(ev.start);
        const e = toDateStr(ev.end || ev.start);
        if (s >= e) return;
        if (e < visStartDate || s > visEndDate) return;
        const idxS = week.findIndex(d => d.dateStr === s);
        const idxE = week.findIndex(d => d.dateStr === e);
        const startIdx = Math.max(idxS >= 0 ? idxS : visStartIdx, visStartIdx);
        const endIdx = Math.min(idxE >= 0 ? idxE : visEndIdx, visEndIdx);
        if (startIdx > endIdx) return;
        bars.push({ weekIdx: wi, ev, startCol: startIdx + 1, span: endIdx - startIdx + 1 });
      });
    });
    return bars;
  }, [weeks, events]);

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
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900">학사일정</h1>
          <button onClick={goToToday} className="px-3 py-1 text-xs font-bold bg-frage-navy text-white rounded-full">오늘</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <button onClick={prevMonth} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">◀</button>
          <div className="text-lg font-bold text-slate-900">{monthName(year, month)} {year}</div>
          <button onClick={nextMonth} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">▶</button>
        </div>
        {loading ? (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-px bg-slate-100">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="bg-white min-h-24 p-2">
                  <div className="w-10 h-4 bg-slate-100 rounded mb-2" />
                  <div className="space-y-1">
                    <div className="h-5 bg-slate-100 rounded" />
                    <div className="h-5 bg-slate-100 rounded" />
                    <div className="h-5 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-px bg-slate-100 text-xs font-bold text-slate-500">
              {["일","월","화","수","목","금","토"].map(d => (
                <div key={d} className="bg-white p-2 text-center">{d}</div>
              ))}
            </div>
            <div className="space-y-px bg-slate-100">
              {weeks.map((week, wi) => {
                const bars = weekBars.filter(b => b.weekIdx === wi);
                return (
                  <div key={wi} className="relative">
                    <div className="grid grid-cols-7 gap-px">
                      {week.map(cell => {
                        const list = eventsByDay[cell.dateStr] || [];
                        return (
                          <div key={cell.dateStr} className={`bg-white min-h-24 p-2 ${cell.outside ? "bg-slate-50 text-slate-400" : ""}`}>
                            <div className="text-xs font-bold">{cell.label}</div>
                            <div className="mt-1 space-y-1">
                              {list.slice(0, 3).map(ev => (
                                <button
                                  key={ev.id}
                                  onClick={() => setSelected(ev)}
                                  className={`w-full text-left text-[11px] px-2 py-1 rounded ${TYPE_STYLE[ev.type]}`}
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
                    <div className="absolute left-0 right-0 top-6 grid grid-cols-7 gap-px px-px">
                      {bars.map(b => (
                        <button
                          key={`${wi}_${b.ev.id}`}
                          onClick={() => setSelected(b.ev)}
                          className={`h-5 rounded ${TYPE_STYLE[b.ev.type]}`}
                          style={{ gridColumn: `${b.startCol} / span ${b.span}` }}
                        >
                          <span className="text-[11px] px-2">{b.ev.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
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
                <span className="text-slate-500 font-bold">유형</span>
                <span className="text-slate-800 font-bold">{selected.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">기간</span>
                <span className="text-slate-800 font-bold">{selected.start} ~ {selected.end}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">캠퍼스</span>
                <span className="text-slate-800 font-bold">{selected.campus || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">반</span>
                <span className="text-slate-800 font-bold">{selected.className || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">장소</span>
                <span className="text-slate-800 font-bold">{selected.place || "-"}</span>
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
  );
}
