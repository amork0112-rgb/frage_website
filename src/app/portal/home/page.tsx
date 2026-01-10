//src/app/portal/home
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, FileText, HelpCircle, CheckCircle, FileCheck, Calendar, Truck, AlertTriangle } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import { supabase } from "@/lib/supabase";

export default function ParentPortalHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [studentStatus, setStudentStatus] = useState<string | null>(null); // 'enrolled' or 'new', set by server only
  const [newStudentProfile, setNewStudentProfile] = useState<any>(null);
  
  // For Enrolled Students
  const [monthlyReports, setMonthlyReports] = useState<{ id: string; title: string; date: string; status: string }[]>([]);
  const [notifications, setNotifications] = useState<{ id?: string; message: string; date?: string }[]>([]);
  
  // For New Students
  const [currentStep, setCurrentStep] = useState("대기");
  const [admissionOpen, setAdmissionOpen] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [myReservation, setMyReservation] = useState<any>(null);

  const [studentId, setStudentId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [allSlots, setAllSlots] = useState<any[]>([]);
  const fmtYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const parseYMD = (s: string) => {
    const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
    return new Date(y, m - 1, d);
  };
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const DEFAULT_TIMES = useMemo((): string[] => {
    const times: string[] = [];
    for (let h = 10; h <= 20; h++) {
      times.push(`${String(h).padStart(2, "0")}:00`);
    }
    return times;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) {
          setAuthorized(false);
          setAuthChecked(true);
          router.replace("/portal");
          return;
        }
        const role = (user.app_metadata as any)?.role ?? null;
        if (role !== "parent") {
          setAuthorized(false);
          setAuthChecked(true);
          router.replace("/portal");
          return;
        }
        setAuthorized(true);
        setAuthChecked(true);
      } catch {}
    })();
    const today = new Date();
    while (today.getDay() === 0 || today.getDay() === 6) {
      today.setDate(today.getDate() + 1);
    }
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!authChecked || !authorized) {
          setLoading(false);
          return;
        }
        const res = await fetch("/api/portal/home", { cache: "no-store" });
        const payload = await res.json();
        const students = Array.isArray(payload?.students) ? payload.students : [];
        if (students.length === 0) {
          router.replace("/admission");
          return;
        }
        setStudentStatus("enrolled");
        const first = students[0] || null;
        setStudentId(first?.id ? String(first.id) : null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked, authorized, router]);

  const handleReserve = (slot: any) => {
    if (!confirm(`${slot.date} ${slot.time}에 입학 테스트를 예약하시겠습니까?`)) return;

    const reservation = {
        slotId: slot.id,
        date: slot.date,
        time: slot.time,
        reservedAt: new Date().toISOString()
    };

    setMyReservation(reservation);

    setAllSlots(prev => prev.map((s: any) => s.id === slot.id ? { ...s, current: (s.current || 0) + 1 } : s));
    setAvailableSlots(prev => prev.map((s: any) => s.id === slot.id ? { ...s, current: (s.current || 0) + 1 } : s).filter((s: any) => s.isOpen));
    
    alert("예약이 완료되었습니다.");
  };

  const handleCancelReservation = () => {
      if(!confirm("예약을 취소하시겠습니까?")) return;
      
      if (myReservation) {
        const id = myReservation.slotId;
        setAllSlots(prev => prev.map((s: any) => s.id === id ? { ...s, current: Math.max(0, (s.current || 1) - 1) } : s));
        setAvailableSlots(prev => prev.map((s: any) => s.id === id ? { ...s, current: Math.max(0, (s.current || 1) - 1) } : s).filter((s: any) => s.isOpen));
      }

      setMyReservation(null);
  };

  // Fetch data for Enrolled Students
  useEffect(() => {
    if (studentStatus !== "enrolled") return;
    if (!studentId) return;
    
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/portal/reports?studentId=${studentId}`);
        const data = await res.json();
        if (alive) {
          const items = (data?.items || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            date: r.date,
            status: r.status
          }));
          setMonthlyReports(items);
        }
      } catch {}
      try {
        const res = await fetch(`/api/portal/notifications?studentId=${studentId}`);
        const data = await res.json();
        if (alive) {
          const list = (data?.items || []).map((n: any) => ({
            id: n.id,
            message: n.message,
            date: n.date
          }));
          setNotifications(list);
        }
      } catch {}
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [studentId, studentStatus]);

  if (!authChecked) return null;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  // --- NEW STUDENT VIEW ---
  if (studentStatus === "new") {
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
        <PortalHeader />
        
        <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-yellow-700">신규 학생 상태</div>
              <div className="text-sm font-bold text-yellow-900">{(newStudentProfile?.status || "waiting") === "waiting" ? "상담 대기" : String(newStudentProfile?.status || "신규")}</div>
              <div className="text-xs text-yellow-800 mt-1">아직 수업은 시작되지 않았습니다.</div>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById("consultation-reservation");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
            >
              상담 예약
            </button>
          </div>
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900">
              환영합니다,<br/>
              <span className="text-frage-blue">{newStudentProfile?.englishFirstName || newStudentProfile?.passportEnglishName || newStudentProfile?.studentName}</span> 학부모님!
            </h1>
            <p className="text-slate-500 mt-2 text-sm">현재 입학 절차가 진행 중입니다.</p>
          </div>

          {/* Current Status Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">현재 진행 상태</p>
                <h2 className="text-xl font-bold text-slate-900">{currentStep}</h2>
              </div>
            </div>
            
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-blue-500 transition-all duration-500"
                 style={{ 
                   width: admissionOpen ? "70%" : (myReservation || currentStep.includes("상담")) ? "40%" : "10%" 
                 }}
               ></div>
            </div>
            <p className="text-right text-xs text-blue-500 font-bold mt-2">
              {admissionOpen ? "입학 서류 작성 단계" : myReservation ? "입학 테스트 예약 완료" : "입학 테스트 예약 대기"}
            </p>
          </div>

          {/* STEP 1: Admission Test Reservation */}
          {!admissionOpen && (
            <section className="animate-fade-in-up delay-100">
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    STEP 1. 입학 테스트 예약
                </h3>
                
                {myReservation ? (
                    <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="inline-block px-2 py-0.5 rounded bg-purple-200 text-purple-700 text-xs font-bold mb-2">예약 완료</span>
                                <h4 className="text-lg font-bold text-slate-800">입학 테스트 일정이 확정되었습니다.</h4>
                                <p className="text-slate-600 mt-1">
                                    {myReservation.date} {myReservation.time}
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
                                    * 변경이 필요하시면 학원으로 문의해주세요.
                                </p>
                            </div>
                            <button 
                                onClick={handleCancelReservation}
                                className="text-sm text-slate-400 underline hover:text-red-500"
                            >
                                예약 취소
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                      <div id="consultation-reservation" className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="p-4 flex items-center justify-between">
                          <div className="font-bold text-slate-900">
                            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setViewMode("month")}
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${viewMode === "month" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 border-slate-200"}`}
                            >
                              월간
                            </button>
                            <button 
                              onClick={() => setViewMode("week")}
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${viewMode === "week" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 border-slate-200"}`}
                            >
                              주간
                            </button>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => {
                                  if (viewMode === "month") {
                                    const d = new Date(currentMonth);
                                    d.setMonth(d.getMonth() - 1);
                                    const nextMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                                    setCurrentMonth(nextMonth);
                                    
                                  } else {
                                    const base = parseYMD(selectedDate || fmtYMD(new Date()));
                                    base.setDate(base.getDate() - 7);
                                    const nextDate = fmtYMD(base);
                                    setSelectedDate(nextDate);
                                    const nextMonth = new Date(base.getFullYear(), base.getMonth(), 1);
                                    setCurrentMonth(nextMonth);
                                    
                                  }
                                }}
                                className="p-2 rounded-lg border border-slate-200 bg-white"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                              <button
                                onClick={() => {
                                  if (viewMode === "month") {
                                    const d = new Date(currentMonth);
                                    d.setMonth(d.getMonth() + 1);
                                    const nextMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                                    setCurrentMonth(nextMonth);
                                    
                                  } else {
                                    const base = parseYMD(selectedDate || fmtYMD(new Date()));
                                    base.setDate(base.getDate() + 7);
                                    const nextDate = fmtYMD(base);
                                    setSelectedDate(nextDate);
                                    const nextMonth = new Date(base.getFullYear(), base.getMonth(), 1);
                                    setCurrentMonth(nextMonth);
                                    
                                  }
                                }}
                                className="p-2 rounded-lg border border-slate-200 bg-white"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 pt-0">
                          {viewMode === "month" ? (
                            <div className="grid grid-cols-7 gap-2">
                              {["일","월","화","수","목","금","토"].map((d) => (
                                <div key={d} className="text-xs font-bold text-slate-400 text-center">{d}</div>
                              ))}
                              {(() => {
                                const startDay = new Date(currentMonth);
                                const firstDayIndex = startDay.getDay();
                                const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                                const today = new Date();
                                const cells = [];
                                for (let i = 0; i < firstDayIndex; i++) {
                                  cells.push(<div key={`pad-${i}`} />);
                                }
                                for (let day = 1; day <= daysInMonth; day++) {
                                  const y = currentMonth.getFullYear();
                                  const m = String(currentMonth.getMonth() + 1).padStart(2, "0");
                                  const dd = String(day).padStart(2, "0");
                                  const dateStr = `${y}-${m}-${dd}`;
                                  const isToday = today.getFullYear() === y && today.getMonth() === currentMonth.getMonth() && today.getDate() === day;
                                  const isSelected = selectedDate === dateStr;
                                  cells.push(
                                    <button
                                      key={dateStr}
                                      onClick={() => {
                                        setSelectedDate(dateStr);
                                      }}
                                      className={`h-16 md:h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected ? "border-purple-400 bg-purple-50" : "border-slate-200 bg-white"}`}
                                    >
                                      <div className={`text-xs md:text-sm font-bold ${isToday ? "text-purple-600" : "text-slate-700"}`}>
                                        {day}
                                      </div>
                                      <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                                        {allSlots.filter(s => s.date === dateStr && s.isOpen).length}개 오픈
                                      </div>
                                    </button>
                                  );
                                }
                                return cells;
                              })()}
                            </div>
                          ) : (
                            <div className="grid grid-cols-7 gap-2">
                              {["일","월","화","수","목","금","토"].map((d) => (
                                <div key={d} className="text-xs font-bold text-slate-400 text-center">{d}</div>
                              ))}
                              {(() => {
                                const base = parseYMD(selectedDate || fmtYMD(new Date()));
                                const dayIdx = base.getDay();
                                const start = new Date(base);
                                start.setDate(base.getDate() - dayIdx);
                                const today = new Date();
                                const cells = [];
                                for (let i = 0; i < 7; i++) {
                                  const d = new Date(start);
                                  d.setDate(start.getDate() + i);
                                  const y = d.getFullYear();
                                  const m = String(d.getMonth() + 1).padStart(2, "0");
                                  const dd = String(d.getDate()).padStart(2, "0");
                                  const dateStr = `${y}-${m}-${dd}`;
                                  const isToday = today.getFullYear() === y && today.getMonth() === d.getMonth() && today.getDate() === d.getDate();
                                  const isSelected = selectedDate === dateStr;
                                  cells.push(
                                    <button
                                      key={dateStr}
                                      onClick={() => {
                                        setSelectedDate(dateStr);
                                      }}
                                      className={`h-16 md:h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected ? "border-purple-400 bg-purple-50" : "border-slate-200 bg-white"}`}
                                    >
                                      <div className={`text-xs md:text-sm font-bold ${isToday ? "text-purple-600" : "text-slate-700"}`}>
                                        {d.getDate()}
                                      </div>
                                      <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                                        {allSlots.filter(s => s.date === dateStr && s.isOpen).length}개 오픈
                                      </div>
                                    </button>
                                  );
                                }
                                return cells;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {(() => {
                          const baseTimes = DEFAULT_TIMES;
                          const openSlots = allSlots
                            .filter(s => s.date === selectedDate && s.isOpen)
                            .sort((a, b) => {
                              const ai = baseTimes.indexOf(a.time);
                              const bi = baseTimes.indexOf(b.time);
                              if (ai === -1 || bi === -1) return a.time.localeCompare(b.time);
                              return ai - bi;
                            });
                          if (openSlots.length === 0) {
                            return (
                              <div className="col-span-3 text-center text-slate-400 text-sm font-medium py-6">
                                선택한 날짜에 예약 가능한 시간이 없습니다.
                              </div>
                            );
                          }
                          return openSlots.map(slot => {
                            const isFull = (slot.current || 0) >= slot.max;
                            const canReserve = !isFull;
                            return (
                              <button
                                key={slot.id}
                                onClick={() => canReserve && handleReserve(slot)}
                                disabled={!canReserve}
                                className={`h-20 rounded-2xl border text-sm font-bold flex flex-col items-center justify-center ${
                                  canReserve
                                    ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                <span>{slot.time}</span>
                                <span className="text-xs">{`신청 ${slot.current || 0}/${slot.max}`}</span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                )}
            </section>
          )}

          {/* Action Items */}
          {admissionOpen ? (
             <section className="animate-fade-in-up">
              <Link href="/portal/admission" className="block group">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 transform transition-all hover:scale-[1.02]">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold backdrop-blur-sm">필수</span>
                        <h2 className="text-xl font-bold">신규 입학 서류 패키지</h2>
                      </div>
                      <p className="text-blue-100 text-sm mb-4">입학원서, 실태조사서 등 필수 서류를<br/>한 번에 제출해주세요.</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-white group-hover:text-blue-600 transition-all">
                      <FileCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-100 group-hover:text-white">
                    <span>서류 작성하기</span>
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </section>
          ) : (
            <div className="bg-slate-100 rounded-xl p-4 text-center text-slate-500 text-sm">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <p>입학이 확정되면<br/>입학 서류 패키지가 이곳에 표시됩니다.</p>
            </div>
          )}

          {/* Guide Links */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Truck className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-800">셔틀버스 안내</p>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <Calendar className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-800">입학 일정</p>
             </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-400">
              입학 관련 문의: 053-754-0577
            </p>
          </div>

        </main>
      </div>
    );
  }

  // --- ENROLLED STUDENT VIEW (Existing) ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />

      <main className="px-4 py-6 max-w-2xl mx-auto space-y-8">
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-frage-blue" />
            공지사항
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
            {notifications.length > 0 ? notifications.map((n, idx) => (
              <div key={n.id || idx} className="p-4">
                <p className="text-sm text-slate-800 font-medium">{n.message}</p>
                {n.date && <p className="text-xs text-slate-400 mt-1">{n.date}</p>}
              </div>
            )) : (
              <div className="p-4 text-sm text-slate-500">현재 공지사항이 없습니다.</div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-frage-navy" />
            학부모 포털 사용방법
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3 text-sm text-slate-700">
            <p className="font-bold text-slate-900">로그인 후 이용 가능한 주요 메뉴:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>영상 과제: 자녀의 오늘 과제를 녹화/확인합니다.</li>
              <li>월간 리포트: 학습 진행과 피드백을 확인합니다.</li>
              <li>공지사항: 학원 안내 및 공지 메시지를 확인합니다.</li>
              <li>요청 전달: 결석/지각/문의 등 전달 사항을 등록합니다.</li>
              <li>내 자녀: 자녀 기본 정보와 차량(등·하원) 정보를 관리합니다.</li>
            </ul>
            <p className="font-bold text-slate-900 mt-3">빠른 시작:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>상단 메뉴에서 원하는 기능으로 이동하세요.</li>
              <li>자녀 사진을 눌러 프로필 사진을 업로드할 수 있습니다.</li>
              <li>차량 정보 저장 후에는 포털 홈에서 최신 공지를 우선 확인하세요.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-frage-navy" />
            월간 리포트 (Monthly Report)
          </h2>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
            {(monthlyReports.length > 0 ? monthlyReports : []).map((report) => (
              <Link key={report.id} href="/portal/report" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-frage-navy group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{report.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{report.date}</p>
                  </div>
                </div>
              </Link>
            ))}
            {monthlyReports.length === 0 && (
              <div className="p-4 text-sm text-slate-500">아직 발행된 월간 리포트가 없습니다.</div>
            )}
          </div>
        </section>


      </main>
    </div>
  );
}
