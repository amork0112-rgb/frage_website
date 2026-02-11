"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Bell, 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  FileCheck, 
  Calendar, 
  Truck, 
  AlertTriangle, 
  ChevronDown,
  MessageSquare,
  Video,
  User
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import { supabase } from "@/lib/supabase";

export default function ParentPortalHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [studentStatus, setStudentStatus] = useState<string | null>(null);
  const [studentType, setStudentType] = useState<"enrolled" | "applicant" | null>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [needOnboarding, setNeedOnboarding] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4>(1);
  const [onboardingUseBus, setOnboardingUseBus] = useState<boolean | null>(null);
  const [onboardingCommuteType, setOnboardingCommuteType] = useState<"bus" | "pickup" | "walk" | "">("");
  const [onboardingAddress, setOnboardingAddress] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  
  // For Enrolled Students
  const [monthlyReports, setMonthlyReports] = useState<{ id: string; title: string; date: string; status: string; target_month: string; published_at: string }[]>([]);
  const [notifications, setNotifications] = useState<{ id?: string; message: string; date?: string; title?: string; isRead?: boolean; category?: string; createdAt?: string }[]>([]);
  
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
        const { data: parent } = await supabase
          .from("parents")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!parent) {
          setAuthorized(false);
          setAuthChecked(true);
          router.replace("/portal");
          return;
        }
        setAuthorized(true);
        setAuthChecked(true);
        setAuthUserId(user.id);
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
        
        const first = students[0] || null;
        if (first && first.type === "applicant") {
          setStudentType("applicant");
          setStudentProfile(first);
          setStudentStatus(null);
        } else {
          setStudentStatus("enrolled");
          setStudentType("enrolled");
          setStudentProfile(first);
        }
        if (first && first.id) {
          setStudentId(String(first.id));
        } else {
          setStudentId(null);
        }
        if (first && first.type === "enrolled") {
          const profileCompleted = first.profile_completed === true;
          const parentAuthUserId = first.parent_auth_user_id ?? null;
          const useBus =
            typeof first.use_bus === "boolean" ? first.use_bus : null;
          const address =
            typeof first.address === "string" && first.address.trim().length > 0
              ? first.address
              : "";
          const need =
            profileCompleted !== true ||
            parentAuthUserId == null ||
            useBus == null ||
            (useBus === true && !address);
          setNeedOnboarding(need);
          if (useBus !== null) {
            setOnboardingUseBus(useBus);
          } else {
            setOnboardingUseBus(null);
          }
          if (useBus === true) {
            setOnboardingCommuteType("bus");
          } else {
            setOnboardingCommuteType("");
          }
          setOnboardingAddress(address);
          setOnboardingStep(1);
          setOnboardingError(null);
        } else {
          setNeedOnboarding(false);
        }
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
            status: r.status,
            target_month: r.target_month || r.date,
            published_at: r.created_at || r.date
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
            date: n.date,
            title: n.title || "알림",
            isRead: n.read_at != null,
            category: n.category || "General",
            createdAt: n.created_at || new Date().toISOString()
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
  if (studentType === "applicant") {
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
        <PortalHeader />
        
        <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-yellow-700">신규 학생 상태</div>
              <div className="text-sm font-bold text-yellow-900">{(studentProfile?.status || "waiting") === "waiting" ? "상담 대기" : String(studentProfile?.status || "신규")}</div>
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
              <span className="text-frage-blue">{studentProfile?.englishFirstName || studentProfile?.passportEnglishName || studentProfile?.studentName}</span> 학부모님!
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
              <div className="block group">
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
              </div>
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

  // --- ENROLLED STUDENT VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />

      {needOnboarding && studentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 mx-4 relative">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    차량 배정 및 학습 안내를 위해{" "}
                    <br className="hidden sm:block" />
                    처음 한 번만 정보를 확인해 주세요.
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    입력하신 정보는 언제든지 수정할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                    {onboardingStep}
                  </span>
                  <span className="font-bold">
                    {onboardingStep === 1
                      ? "Step 1. 보호자 계정 연결"
                      : onboardingStep === 2
                      ? "Step 2. 등·하원 / 차량 정보"
                      : onboardingStep === 3
                      ? "Step 3. 주소 입력"
                      : "Step 4. 완료"}
                  </span>
                </div>
                <span className="font-bold">
                  {onboardingStep}/4
                </span>
              </div>
            </div>

            {onboardingStep === 1 && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      현재 로그인한 계정을 자녀 정보와 연결합니다.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      계정 연결 중입니다. 다음 버튼을 눌러 계속 진행해 주세요.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-2">
                      차량을 이용하시나요?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOnboardingUseBus(true);
                          setOnboardingCommuteType("bus");
                        }}
                        className={`px-4 py-3 rounded-xl border text-sm font-bold ${
                          onboardingUseBus === true
                            ? "bg-frage-blue text-white border-frage-blue"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOnboardingUseBus(false);
                          if (
                            onboardingCommuteType === "" ||
                            onboardingCommuteType === "bus"
                          ) {
                            setOnboardingCommuteType("pickup");
                          }
                        }}
                        className={`px-4 py-3 rounded-xl border text-sm font-bold ${
                          onboardingUseBus === false
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-2">
                      귀가 방식 선택
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={onboardingUseBus === false}
                        onClick={() => {
                          if (onboardingUseBus !== false) {
                            setOnboardingCommuteType("bus");
                          }
                        }}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold ${
                          onboardingCommuteType === "bus"
                            ? "bg-frage-blue text-white border-frage-blue"
                            : "bg-white text-slate-700 border-slate-200"
                        } ${
                          onboardingUseBus === false
                            ? "opacity-40 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        Bus
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardingCommuteType("pickup")}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold ${
                          onboardingCommuteType === "pickup"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardingCommuteType("walk")}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold ${
                          onboardingCommuteType === "walk"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        Walk
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      차량 미이용 시에도 귀가 방식을 선택해 주세요.
                    </p>
                  </div>
                </div>
                <div className="flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    disabled={
                      onboardingUseBus === null ||
                      onboardingCommuteType === ""
                    }
                    onClick={() => setOnboardingStep(3)}
                    className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-900">
                    주소 입력
                    {onboardingUseBus === true && (
                      <span className="text-xs text-red-500 ml-1">(필수)</span>
                    )}
                  </p>
                  <input
                    type="text"
                    value={onboardingAddress}
                    onChange={(e) => setOnboardingAddress(e.target.value)}
                    placeholder="예: 대구 수성구 ○○아파트 ○동 ○○호"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-frage-blue bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    셔틀 버스를 이용하시는 경우 등·하원 기준 주소를 입력해 주세요.
                  </p>
                  {onboardingUseBus === false && (
                    <p className="text-[11px] text-slate-400">
                      버스를 이용하지 않는 경우 주소 입력은 선택입니다.
                    </p>
                  )}
                </div>
                <div className="flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    disabled={
                      onboardingUseBus === true &&
                      onboardingAddress.trim().length === 0
                    }
                    onClick={() => setOnboardingStep(4)}
                    className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}

            {onboardingStep === 4 && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-bold text-slate-900">
                    입력 내용 확인
                  </p>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>
                      • 차량 이용 여부:{" "}
                      <span className="font-bold">
                        {onboardingUseBus ? "Yes (버스 이용)" : "No (버스 미이용)"}
                      </span>
                    </p>
                    <p>
                      • 귀가 방식:{" "}
                      <span className="font-bold">
                        {onboardingCommuteType === "bus"
                          ? "Bus"
                          : onboardingCommuteType === "pickup"
                          ? "Pickup"
                          : onboardingCommuteType === "walk"
                          ? "Walk"
                          : "-"}
                      </span>
                    </p>
                    <p>
                      • 주소:{" "}
                      <span className="font-bold">
                        {onboardingAddress.trim() || "입력 없음"}
                      </span>
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    저장 후에도 내 자녀 메뉴에서 언제든지 수정할 수 있습니다.
                  </p>
                  {onboardingError && (
                    <p className="text-[11px] text-red-500">
                      {onboardingError}
                    </p>
                  )}
                </div>
                <div className="flex justify-between gap-2">
                  <button
                    type="button"
                    disabled={onboardingSaving}
                    onClick={() => setOnboardingStep(3)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    disabled={
                      onboardingSaving ||
                      onboardingUseBus === null ||
                      onboardingCommuteType === "" ||
                      (onboardingUseBus === true &&
                        onboardingAddress.trim().length === 0)
                    }
                    onClick={async () => {
                      if (!studentId || !authUserId) return;
                      setOnboardingSaving(true);
                      setOnboardingError(null);
                      try {
                        const payload: any = {
                          use_bus: onboardingUseBus,
                          commute_type:
                            onboardingCommuteType === "walk"
                              ? "self"
                              : onboardingCommuteType === "pickup"
                              ? "self"
                              : "bus",
                          address:
                            onboardingAddress.trim().length > 0
                              ? onboardingAddress.trim()
                              : null,
                          parent_auth_user_id: authUserId,
                          profile_completed: true,
                        };
                        const res = await fetch(
                          `/api/students/${studentId}/onboarding`,
                          {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(payload),
                          }
                        );
                        if (!res.ok) {
                          setOnboardingError("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
                          setOnboardingSaving(false);
                          return;
                        }
                        setNeedOnboarding(false);
                      } catch {
                        setOnboardingError("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
                        setOnboardingSaving(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {onboardingSaving ? "저장 중..." : "저장하고 시작하기"}
                  </button>
                </div>
              </div>
            )}

            {needOnboarding && (
              <details className="mt-4 text-sm text-gray-500 border-t border-slate-100 pt-4">
                <summary className="cursor-pointer font-medium select-none flex items-center gap-2 text-slate-600">
                  <HelpCircle className="w-4 h-4" />
                  자주 묻는 질문
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-slate-500 pl-6 list-disc">
                  <li>아이디/비밀번호를 등록해주세요</li>
                  <li>재원생의 경우 회원가입 없이 휴대폰 인증만 합니다.</li>
                  <li>차량·학습 안내를 위한 정보로 처음 한 번만 입력합니다.</li>
                </ul>
              </details>
            )}
          </div>
        </div>
      )}

      <main className="px-4 md:px-6 py-6 max-w-6xl mx-auto space-y-8">
        
        {/* Top Section: Welcome & Quick Status */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                 안녕하세요, <span className="text-frage-blue">{studentProfile?.englishName || studentProfile?.name || "학부모"}</span>님! 👋
              </h1>
              <p className="text-sm text-slate-500 font-medium">오늘도 즐거운 하루 보내세요.</p>
           </div>
           
           {/* Quick Stats (Desktop) */}
           <div className="hidden md:flex gap-4">
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-frage-blue">
                    <FileCheck className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Report</p>
                    <p className="text-sm font-black text-slate-900">{monthlyReports.length > 0 ? "도착함" : "없음"}</p>
                 </div>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-frage-orange">
                    <Bell className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Notice</p>
                    <p className="text-sm font-black text-slate-900">{notifications.filter(n => !n.isRead).length}건</p>
                 </div>
              </div>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Monthly Report Card */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-white rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-frage-navy" />
                      월간 리포트
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">이번 달 학습 성취도를 확인하세요.</p>
                  </div>
                  <Link href="/portal/report" className="text-xs font-bold text-frage-blue bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                    전체보기
                  </Link>
                </div>

                <div className="space-y-3">
                  {monthlyReports.length > 0 ? (
                    monthlyReports.slice(0, 2).map((report) => (
                      <Link key={report.id} href="/portal/report" className="block">
                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-100 transition-colors border border-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-frage-navy shadow-sm border border-slate-100">
                              <span className="text-lg font-black">{new Date(report.target_month).getMonth() + 1}</span>
                              <span className="text-[10px] font-bold text-slate-400 ml-0.5">월</span>
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900">{report.title}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{new Date(report.published_at).toLocaleDateString()} 발행</p>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400">
                            <ChevronDown className="w-5 h-5 -rotate-90" />
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-sm text-slate-500 font-medium">아직 발행된 리포트가 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Notices Grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-frage-orange" />
                  공지사항
                </h2>
                <Link href="/portal/notices" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                  더보기
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notifications.slice(0, 4).map((notice) => (
                  <Link key={notice.id} href={`/portal/notices/${notice.id}`}>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all h-full flex flex-col justify-between group">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {!notice.isRead && <span className="w-1.5 h-1.5 rounded-full bg-frage-blue"></span>}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            notice.category === 'Schedule' ? 'bg-orange-50 text-orange-600' : 
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {notice.category}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-frage-blue transition-colors">
                          {notice.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                        <span>{new Date(notice.createdAt!).toLocaleDateString()}</span>
                        <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300" />
                      </p>
                    </div>
                  </Link>
                ))}
                {notifications.length === 0 && (
                  <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">등록된 공지사항이 없습니다.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column (Side Widgets) */}
          <div className="space-y-6">
            
            {/* Quick Actions Grid */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">빠른 메뉴</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/portal/requests" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-frage-blue/5 hover:text-frage-blue transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 mb-2 group-hover:text-frage-blue group-hover:scale-110 transition-all">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">요청 전달</span>
                </Link>
                <Link href="/portal/video" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-frage-blue/5 hover:text-frage-blue transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 mb-2 group-hover:text-frage-blue group-hover:scale-110 transition-all">
                    <Video className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">영상 과제</span>
                </Link>
                <Link href="/portal/child" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-frage-blue/5 hover:text-frage-blue transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 mb-2 group-hover:text-frage-blue group-hover:scale-110 transition-all">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">자녀 정보</span>
                </Link>
                <Link href="https://frage.kr" target="_blank" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-frage-blue/5 hover:text-frage-blue transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 mb-2 group-hover:text-frage-blue group-hover:scale-110 transition-all">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">문의하기</span>
                </Link>
              </div>
            </section>

            {/* Shuttle Bus Status (Mockup) */}
            <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <Truck className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-bold">셔틀 버스</h3>
                    <p className="text-xs text-slate-400">실시간 위치 확인</p>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-300">현재 상태</span>
                    <span className="text-xs font-bold text-green-400 bg-green-400/20 px-2 py-0.5 rounded-full">운행중</span>
                  </div>
                  <p className="text-sm font-medium">잠시 후 <span className="text-yellow-400 font-bold">정문 앞</span> 도착 예정</p>
                </div>

                <button className="w-full py-3 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors">
                  위치 보기
                </button>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
