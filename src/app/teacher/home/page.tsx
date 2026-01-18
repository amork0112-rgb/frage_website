"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Video, FileText, CheckCircle2, Clock, ArrowRight, Calendar, ExternalLink } from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";

type Student = { id: string; name: string; englishName: string; className: string; campus: string };

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
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("");
  const [teacherClass, setTeacherClass] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [todayReservations, setTodayReservations] = useState<number>(0);
  const [pendingChecklists, setPendingChecklists] = useState<number>(0);
  const [unreadParentRequests, setUnreadParentRequests] = useState<number>(0);

  useEffect(() => {
    (async () => {
      if (!supabaseReady) return;
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      const uid = user?.id || null;
      setTeacherId(uid);
      if (!uid) return;
      
      try {
        const { data: trow } = await supabase
          .from("teachers")
          .select("name")
          .eq("id", uid)
          .limit(1);
        const t = Array.isArray(trow) && trow.length > 0 ? trow[0] : null;
        const fallback =
          (data?.user?.user_metadata as any)?.name ||
          String(data?.user?.email || "").split("@")[0] ||
          "";
        setTeacherName(t?.name ? String(t.name) : fallback);
      } catch {}
      const { data: profile } = await supabase
        .from("profiles")
        .select("class_name")
        .eq("id", uid)
        .single();
      const cls = (profile as any)?.class_name || null;
      setTeacherClass(cls);
    })();
  }, []);

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const ym = `${y}-${String(m + 1).padStart(2, "0")}`;

  useEffect(() => {
    const load = async () => {
      if (!supabaseReady) return;
      try {
        const res = await fetch(`/api/calendar?year=${y}&month=${m + 1}`, { cache: "no-store" });
        const data = await res.json();
        const items: CalendarEvent[] = Array.isArray(data?.items) ? data.items : [];
        setEvents(items);
      } catch {
        setEvents([]);
      }
      const today = new Date();
      const ty = today.getFullYear();
      const tm = String(today.getMonth() + 1).padStart(2, "0");
      const td = String(today.getDate()).padStart(2, "0");
      const todayStr = `${ty}-${tm}-${td}`;
      const { data: slotsToday } = await supabase
        .from("consultation_slots")
        .select("id,date")
        .eq("date", todayStr);
      const slotIds = (slotsToday || []).map((s: any) => s.id);
      if (slotIds.length > 0) {
        const { data: rToday } = await supabase
          .from("student_reservations")
          .select("id,slot_id")
          .in("slot_id", slotIds);
        setTodayReservations((rToday || []).length);
      } else {
        setTodayReservations(0);
      }
      const { data: checks } = await supabase
        .from("new_student_checklists")
        .select("id,student_id,checked")
        .eq("checked", false);
      setPendingChecklists((checks || []).length);
      const { data: reqs } = await supabase
        .from("portal_requests")
        .select("id,teacher_id,teacher_read")
        .eq("teacher_read", false)
        .eq("teacher_id", teacherId || "");
      setUnreadParentRequests((reqs || []).length);
      const { data: studs } = await supabase
        .from("students")
        .select("id,name,english_name,class_name,campus")
        .eq("teacher_id", teacherId);
      const mappedStudents: Student[] = Array.isArray(studs)
        ? studs.map((s: any) => ({
            id: String(s.id),
            name: String(s.name || ""),
            englishName: String(s.english_name || ""),
            className: String(s.class_name || ""),
            campus: String(s.campus || ""),
          }))
        : [];
      setStudents(mappedStudents);
    };
    load();
  }, [teacherId, y, m]);

  const myStudents = useMemo(() => {
    if (!teacherClass) return [];
    return students.filter(s => s.className === teacherClass).slice(0, 12);
  }, [students, teacherClass]);
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
        <h1 className="text-2xl font-black text-slate-900 font-serif">
          Hello, {teacherName || "Teacher"}! 👋
        </h1>
        <p className="text-slate-500 mt-1">Here is your dashboard for today.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <section className="col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 font-serif">
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

        <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 font-serif">
              <Clock className="w-5 h-5 text-blue-500" />
              My Schedule
            </h2>
            <p className="text-sm text-slate-500 mb-4">Check your class schedule and room assignments.</p>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="https://docs.google.com/spreadsheets/d/1KNS4HFPrh0nOxRaOeyKX3tMulEth8ozk/edit?gid=1147891973#gid=1147891973"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Kinder Schedule
            </a>
            <a
              href="https://docs.google.com/spreadsheets/d/1Kk0ik1vo8dhFmczVjTEUQgx_WtomeJV8vtCeP1QC0xk/edit?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Primary Schedule
            </a>
          </div>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-serif">
              <Video className="w-5 h-5 text-slate-400" />
              My Students
            </h2>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {myStudents.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">담임 반 학생 데이터가 없습니다.</div>
            ) : (
              myStudents.map((s) => {
                const initials = (s.englishName || s.name)
                  .split(" ")
                  .map(w => w[0]?.toUpperCase())
                  .slice(0, 2)
                  .join("");
                return (
                  <div key={s.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">{initials}</div>
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-frage-blue transition-colors">
                            {s.name} ({s.englishName})
                          </h3>
                          <p className="text-xs text-slate-500">{s.className} • {s.campus}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-frage-blue group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <Link href="/teacher/students" className="block text-center text-sm font-bold text-slate-500 hover:text-frage-blue mt-3 py-2 font-serif">
            View Students
          </Link>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 font-serif">
            <CheckCircle2 className="w-5 h-5 text-slate-400" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            {(() => {
              const today = new Date();
              const ymStr = `${y}-${String(m + 1).padStart(2, "0")}`;
              const candidates = events
                .filter(ev => ev.type === "리포트" && ev.start.startsWith(ymStr))
                .map(ev => new Date(ev.start));
              const lastDay = new Date(y, m + 1, 0);
              const deadline = candidates
                .filter(d => d.getTime() >= today.setHours(0,0,0,0))
                .sort((a, b) => a.getTime() - b.getTime())[0] || lastDay;
              const diff = Math.ceil((deadline.getTime() - new Date().setHours(0,0,0,0)) / 86400000);
              const label =
                diff > 0 ? `Report Deadline: D-${diff}` :
                diff === 0 ? "Report Deadline: Today" :
                "Report Deadline: Passed";
              return (
                <Link href="/teacher/reports" className="group block bg-white p-4 rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-50 text-frage-orange flex items-center justify-center group-hover:bg-frage-orange group-hover:text-white transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Write Monthly Reports</h3>
                        <p className="text-xs text-slate-500">{label}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-frage-orange group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })()}
          </div>
        </section>
      </div>
    </main>
  );
}
