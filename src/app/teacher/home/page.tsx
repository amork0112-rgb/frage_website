"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Video, FileText, CheckCircle2, Clock, ArrowRight, Calendar, Brain, ExternalLink } from "lucide-react";

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

export default function TeacherHome() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin_calendar_events");
      const list = raw ? JSON.parse(raw) : [];
      setEvents(Array.isArray(list) ? list : []);
    } catch {
      setEvents([]);
    }
  }, []);

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const ym = `${y}-${String(m + 1).padStart(2, "0")}`;

  const monthEvents = useMemo(() => {
    const parse = (s: string) => {
      const [yy, mm, dd] = s.split("-").map(Number);
      return new Date(yy, mm - 1, dd);
    };
    const inMonth = (s: string, e: string) => {
      if (s.startsWith(ym) || e.startsWith(ym)) return true;
      const d = parse(s);
      return d.getFullYear() === y && d.getMonth() === m;
    };
    const filtered = events
      .filter((ev) => inMonth(ev.start, ev.end))
      .sort((a, b) => a.start.localeCompare(b.start));
    return filtered.slice(0, 8);
  }, [events, ym, y, m]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">Hello, Ms. Anna! 👋</h1>
        <p className="text-slate-500 mt-1">Here is your dashboard for today.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-frage-orange" />
            This Month
          </h2>
          <ul className="space-y-3">
            {monthEvents.length === 0 ? (
              <li className="text-sm text-slate-500">No events</li>
            ) : (
              monthEvents.map((ev) => {
                const [, mm, dd] = ev.start.split("-");
                const label = `${mm}/${dd}`;
                return (
                  <li key={ev.id} className="flex gap-3 items-start">
                    <span className="text-sm font-bold text-slate-900 w-16 shrink-0">{label}</span>
                    <span className="text-sm text-slate-700 flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${typeDot(ev.type)}`} />
                      {ev.title}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Remember
          </h2>
          <ul className="space-y-3">
            <li className="flex gap-2 items-start text-sm text-slate-600">
              <span className="text-purple-500">•</span>
              Please submit April reports by April 30
            </li>
            <li className="flex gap-2 items-start text-sm text-slate-600">
              <span className="text-purple-500">•</span>
              No classes on April 10 (Holiday)
            </li>
          </ul>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              My Schedule
            </h2>
            <p className="text-sm text-slate-500 mb-4">Check your class schedule and room assignments.</p>
          </div>
          <a
            href="https://docs.google.com/spreadsheets/d/1KNS4HFPrh0nOxRaOeyKX3tMulEth8ozk/edit?gid=1147891973#gid=1147891973"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Google Sheet
          </a>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-slate-400" />
              Videos to Review
            </h2>
            <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">3 pending</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">JS</div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-frage-blue transition-colors">Junseo (Terry)</h3>
                    <p className="text-xs text-slate-500">Submitted 2 hours ago</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-frage-blue group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">MK</div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-frage-blue transition-colors">Minji Kim</h3>
                    <p className="text-xs text-slate-500">Submitted 5 hours ago</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-frage-blue group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            <div className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">DK</div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-frage-blue transition-colors">Donghyun Kim</h3>
                    <p className="text-xs text-slate-500">Submitted yesterday</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-frage-blue group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
          <Link href="/teacher/video" className="block text-center text-sm font-bold text-slate-500 hover:text-frage-blue mt-3 py-2">
            View All Videos
          </Link>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-slate-400" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link href="/teacher/reports" className="group block bg-white p-4 rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 text-frage-orange flex items-center justify-center group-hover:bg-frage-orange group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Write Monthly Reports</h3>
                    <p className="text-xs text-slate-500">April Report Deadline: D-3</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-frage-orange group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
