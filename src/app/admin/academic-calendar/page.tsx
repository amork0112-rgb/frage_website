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
  campus?: "International" | "Andover" | "Platz" | "Atheneum" | "All";
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
  
  // Form State
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

  // Edit State
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/academic-calendar?year=${year}&month=${month + 1}`, { cache: "no-store" });
        const data = await res.json();
        const items: CalendarEvent[] = Array.isArray(data?.items) ? data.items : [];
        setEvents(items);
      } catch {
        setEvents([]);
      }
    })();
  }, [year, month]);

  useEffect(() => {
    (async () => {
      try {
        const y = year;
        const hol: HolidayEvent[] = getKoreanHolidays(y);
        const monthStr = `${y}-${pad(month + 1)}`;
        const monthHolidays = hol.filter((h: HolidayEvent) => h.start.startsWith(monthStr));
        if (monthHolidays.length > 0) {
          await Promise.all(
            monthHolidays.map((h: HolidayEvent) =>
              fetch("/api/admin/academic-calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: h.title,
                  type: "공휴일",
                  start_date: h.start,
                  end_date: h.end,
                  campus: null,
                  class_name: null,
                  place: null,
                  expose_to_parent: h.exposeToParent ?? true,
                  notify: false,
                  notice_link: null,
                }),
              })
            )
          );
          const res = await fetch(`/api/admin/academic-calendar?year=${year}&month=${month + 1}`, { cache: "no-store" });
          const data = await res.json();
          const items: CalendarEvent[] = Array.isArray(data?.items) ? data.items : [];
          setEvents(items);
        }
      } catch {}
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
    // Keep this for list view if needed, but mainly we use eventsByDay
    return events.filter(ev => ev.start.startsWith(monthStr)).sort((a, b) => a.start.localeCompare(b.start));
  }, [events, monthStr]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      let curr = new Date(ev.start);
      const endDt = new Date(ev.end);
      // Safety: limit loop to prevent infinite loop if bad data
      let safety = 0;
      while (curr <= endDt && safety < 365) {
        const y = curr.getFullYear();
        const m = pad(curr.getMonth() + 1);
        const d = pad(curr.getDate());
        const dateStr = `${y}-${m}-${d}`;
        
        if (!map[dateStr]) map[dateStr] = [];
        // Avoid duplicates if multiple passes
        if (!map[dateStr].find(x => x.id === ev.id)) {
          map[dateStr].push(ev);
        }
        
        curr.setDate(curr.getDate() + 1);
        safety++;
      }
    });
    return map;
  }, [events]);

  const addEvent = () => {
    const s = (start || "").trim();
    const e = (end || "").trim();
    const t = title.trim();
    if (!t || !s || !e) return;
    fetch("/api/admin/academic-calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: t,
        type,
        start_date: s,
        end_date: e,
        campus: campus ?? null,
        class_name: className || null,
        place: place || null,
        expose_to_parent: exposeToParent,
        notify,
        notice_link: noticeLink || null,
      }),
    })
      .then(async () => {
        const res = await fetch(`/api/admin/academic-calendar?year=${year}&month=${month + 1}`, { cache: "no-store" });
        const data = await res.json();
        const items: CalendarEvent[] = Array.isArray(data?.items) ? data.items : [];
        setEvents(items);
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
      })
      .catch(() => {});
  };

  const updateEvent = () => {
    if (!editingEvent) return;
    fetch("/api/admin/academic-calendar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingEvent.id,
        title: editingEvent.title,
        type: editingEvent.type,
        start_date: editingEvent.start,
        end_date: editingEvent.end,
        campus: editingEvent.campus ?? null,
        class_name: editingEvent.className || null,
        place: editingEvent.place || null,
        expose_to_parent: editingEvent.exposeToParent,
        notify: editingEvent.notify,
        notice_link: editingEvent.noticeLink || null,
      }),
    })
      .then(async () => {
        const res = await fetch(`/api/admin/academic-calendar?year=${year}&month=${month + 1}`, { cache: "no-store" });
        const data = await res.json();
        const items: CalendarEvent[] = Array.isArray(data?.items) ? data.items : [];
        setEvents(items);
        setEditingEvent(null);
        alert("일정이 수정되었습니다.");
      })
      .catch(() => {});
  };

  const deleteEvent = () => {
    if (!editingEvent) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;
    fetch("/api/admin/academic-calendar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingEvent.id }),
    })
      .then(async () => {
        const res = await fetch(`/api/admin/academic-calendar?year=${year}&month=${month + 1}`, { cache: "no-store" });
        const data = await res.json();
        const items: CalendarEvent[] = Array.isArray(data?.items) ? data.items : [];
        setEvents(items);
        setEditingEvent(null);
      })
      .catch(() => {});
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

  const goToToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900">학사 캘린더</h1>
          <button onClick={goToToday} className="px-3 py-1 text-xs font-bold bg-frage-navy text-white rounded-full hover:bg-slate-800 transition-colors">
            오늘
          </button>
          <button
            onClick={async () => {
              try {
                await fetch("/api/admin/academic-calendar/holidays/init", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ year }),
                });
                const res = await fetch(`/api/admin/academic-calendar?year=${year}&month=${month + 1}`, { cache: "no-store" });
                const data = await res.json();
                const items: CalendarEvent[] = Array.isArray(data?.items) ? data.items : [];
                setEvents(items);
                alert("공휴일 동기화가 완료되었습니다.");
              } catch {}
            }}
            className="px-3 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
          >
            공휴일 동기화
          </button>
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
                      <div 
                        key={ev.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(ev);
                        }}
                        className={`text-[11px] px-2 py-1 rounded cursor-pointer hover:opacity-80 ${ev.type === "공휴일" ? "bg-red-50 text-red-600 border border-red-100" : "bg-slate-50 text-slate-600 border border-slate-100"}`}
                      >
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
                <option value="All">전체</option>
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

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingEvent(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-slate-900">일정 수정</h3>
            <div className="space-y-3">
              <input 
                value={editingEvent.title} 
                onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})} 
                placeholder="제목" 
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" 
              />
              <select 
                value={editingEvent.type} 
                onChange={(e) => setEditingEvent({...editingEvent, type: e.target.value as ScheduleType})} 
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="수업일">수업일</option>
                <option value="방학">방학</option>
                <option value="시험">시험</option>
                <option value="행사">행사</option>
                <option value="차량">차량</option>
                <option value="리포트">리포트</option>
                <option value="공휴일">공휴일</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={editingEvent.start} onChange={(e) => setEditingEvent({...editingEvent, start: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                <input type="date" value={editingEvent.end} onChange={(e) => setEditingEvent({...editingEvent, end: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={editingEvent.campus || ""} 
                  onChange={(e) => setEditingEvent({...editingEvent, campus: (e.target.value || undefined) as any})} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="">캠퍼스 선택</option>
                  <option value="All">전체</option>
                  <option value="International">International</option>
                  <option value="Andover">Andover</option>
                  <option value="Platz">Platz</option>
                  <option value="Atheneum">Atheneum</option>
                </select>
                <input 
                  value={editingEvent.className || ""} 
                  onChange={(e) => setEditingEvent({...editingEvent, className: e.target.value})} 
                  placeholder="반 이름(선택)" 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" 
                />
              </div>
              <input 
                value={editingEvent.place || ""} 
                onChange={(e) => setEditingEvent({...editingEvent, place: e.target.value})} 
                placeholder="장소(선택)" 
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" 
              />
              <input 
                value={editingEvent.noticeLink || ""} 
                onChange={(e) => setEditingEvent({...editingEvent, noticeLink: e.target.value})} 
                placeholder="공지 링크(선택)" 
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" 
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={editingEvent.exposeToParent} onChange={(e) => setEditingEvent({...editingEvent, exposeToParent: e.target.checked})} />
                  학부모에게 공개
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={editingEvent.notify} onChange={(e) => setEditingEvent({...editingEvent, notify: e.target.checked})} />
                  알림 발송
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={updateEvent} className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700">저장</button>
                <button onClick={deleteEvent} className="flex-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 border border-red-200">삭제</button>
                <button onClick={() => setEditingEvent(null)} className="flex-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200">취소</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
