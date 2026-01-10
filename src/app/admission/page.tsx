"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Calendar, FileCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdmissionHeader from "@/components/admission/AdmissionHeader";
import StudentInfoCard from "@/components/admission/StudentInfoCard";

export default function AdmissionPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState("대기");
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const DEFAULT_TIMES = (() => {
    const times: string[] = [];
    for (let h = 10; h <= 20; h++) {
      times.push(`${String(h).padStart(2, "0")}:00`);
    }
    return times;
  })();
  const [allSlots, setAllSlots] = useState<any[]>([]);
  const [myReservation, setMyReservation] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace("/portal");
        return;
      }
      const role = (user.app_metadata as any)?.role ?? null;
      if (role !== "parent") {
        router.replace("/portal");
        return;
      }
      setAuthorized(true);
      setAuthChecked(true);
    })();
  }, [router]);

  useEffect(() => {
    (async () => {
      if (!authChecked || !authorized) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/admission/home", { cache: "no-store" });
        const payload = await res.json();
        const list = Array.isArray(payload?.items) ? payload.items : [];
        setItems(list);
        const first = list[0] || null;
        const status = String(first?.status || "");
        const step =
          status === "waiting"
            ? "상담 대기"
            : status === "consultation_confirmed"
            ? "상담 일정 확정"
            : status === "admission_open"
            ? "입학 서류 작성"
            : status === "approved"
            ? "승인 완료"
            : "대기";
        setCurrentStep(step);
        setAdmissionOpen(status === "admission_open");
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked, authorized]);

  useEffect(() => {
    const today = new Date();
    while (today.getDay() === 0 || today.getDay() === 6) {
      today.setDate(today.getDate() + 1);
    }
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    (async () => {
      try {
        const res = await fetch(`/api/admission/schedules?date=${encodeURIComponent(selectedDate)}`, { cache: "no-store" });
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        setAllSlots((prev) => {
          const others = prev.filter((s) => s.date !== selectedDate);
          return [...others, ...items];
        });
      } catch {}
    })();
  }, [selectedDate]);

  const handleReserve = (slot: any) => {
    if (!confirm(`${slot.date} ${slot.time}에 입학 테스트를 예약하시겠습니까?`)) return;
    (async () => {
      try {
        const res = await fetch("/api/admission/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: slot.date, time: slot.time })
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          alert("예약 처리 중 오류가 발생했습니다.");
          return;
        }
        const reservation = {
          slotId: data?.reservation?.slotId || slot.id,
          date: slot.date,
          time: slot.time,
          reservedAt: new Date().toISOString(),
        };
        setMyReservation(reservation);
        setAllSlots((prev) =>
          prev.map((s: any) => (s.id === slot.id ? { ...s, current: (s.current || 0) + 1 } : s))
        );
        alert("예약이 완료되었습니다.");
      } catch {
        alert("예약 처리 중 오류가 발생했습니다.");
      }
    })();
  };

  const handleCancelReservation = () => {
    if (!confirm("예약을 취소하시겠습니까?")) return;
    if (myReservation) {
      const id = myReservation.slotId;
      setAllSlots((prev) =>
        prev.map((s: any) =>
          s.id === id ? { ...s, current: Math.max(0, (s.current || 1) - 1) } : s
        )
      );
    }
    setMyReservation(null);
  };

  if (!authChecked) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <AdmissionHeader currentStep={currentStep} />
      <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
        <StudentInfoCard
          studentName={items[0]?.student_name || "신규 학생"}
          englishFirstName={items[0]?.english_first_name || ""}
          birthDate={items[0]?.child_birth_date || ""}
          status={
            currentStep === "상담 대기" ? "consulting" :
            currentStep === "상담 일정 확정" ? "consulted" :
            currentStep === "입학 서류 작성" ? "approved" : "waiting"
          }
          campus={items[0]?.campus || undefined}
        />
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
                width: admissionOpen ? "70%" : currentStep.includes("상담") ? "40%" : "10%",
              }}
            ></div>
          </div>
          <p className="text-right text-xs text-blue-500 font-bold mt-2">
            {admissionOpen ? "입학 서류 작성 단계" : currentStep.includes("상담") ? "상담 일정 진행" : "상담 대기"}
          </p>
        </div>
        {!admissionOpen && (
          <section className="animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              STEP 1. 입학 상담/테스트 예약
            </h3>
            {myReservation ? (
              <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-purple-200 text-purple-700 text-xs font-bold mb-2">
                      예약 완료
                    </span>
                    <h4 className="text-lg font-bold text-slate-800">입학 테스트 일정이 확정되었습니다.</h4>
                    <p className="text-slate-600 mt-1">
                      {myReservation.date} {myReservation.time}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">* 변경이 필요하시면 학원으로 문의해주세요.</p>
                  </div>
                  <button onClick={handleCancelReservation} className="text-sm text-slate-400 underline hover:text-red-500">
                    예약 취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="p-4 flex items-center justify-between">
                    <div className="font-bold text-slate-900">
                      {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewMode("month")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                          viewMode === "month" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        월간
                      </button>
                      <button
                        onClick={() => setViewMode("week")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                          viewMode === "week" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 border-slate-200"
                        }`}
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
                              const base = new Date(selectedDate || new Date());
                              const parts = (selectedDate || "").split("-");
                              if (parts.length === 3) base.setFullYear(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                              base.setDate(base.getDate() - 7);
                              const y = base.getFullYear();
                              const m = String(base.getMonth() + 1).padStart(2, "0");
                              const dd = String(base.getDate()).padStart(2, "0");
                              const nextDate = `${y}-${m}-${dd}`;
                              setSelectedDate(nextDate);
                              const nextMonth = new Date(base.getFullYear(), base.getMonth(), 1);
                              setCurrentMonth(nextMonth);
                            }
                          }}
                          className="p-2 rounded-lg border border-slate-200 bg-white"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (viewMode === "month") {
                              const d = new Date(currentMonth);
                              d.setMonth(d.getMonth() + 1);
                              const nextMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                              setCurrentMonth(nextMonth);
                            } else {
                              const base = new Date(selectedDate || new Date());
                              const parts = (selectedDate || "").split("-");
                              if (parts.length === 3) base.setFullYear(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                              base.setDate(base.getDate() + 7);
                              const y = base.getFullYear();
                              const m = String(base.getMonth() + 1).padStart(2, "0");
                              const dd = String(base.getDate()).padStart(2, "0");
                              const nextDate = `${y}-${m}-${dd}`;
                              setSelectedDate(nextDate);
                              const nextMonth = new Date(base.getFullYear(), base.getMonth(), 1);
                              setCurrentMonth(nextMonth);
                            }
                          }}
                          className="p-2 rounded-lg border border-slate-200 bg-white"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pt-0">
                    {viewMode === "month" ? (
                      <div className="grid grid-cols-7 gap-2">
                        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                          <div key={d} className="text-xs font-bold text-slate-400 text-center">
                            {d}
                          </div>
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
                            const isToday =
                              today.getFullYear() === y &&
                              today.getMonth() === currentMonth.getMonth() &&
                              today.getDate() === day;
                            const isSelected = selectedDate === dateStr;
                            cells.push(
                              <button
                                key={dateStr}
                                onClick={() => {
                                  setSelectedDate(dateStr);
                                }}
                                className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${
                                  isSelected ? "border-purple-400 bg-purple-50" : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className={`text-xs md:text-sm font-bold ${isToday ? "text-purple-600" : "text-slate-700"}`}>{day}</div>
                              </button>
                            );
                          }
                          return cells;
                        })()}
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-2">
                        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                          <div key={d} className="text-xs font-bold text-slate-400 text-center">
                            {d}
                          </div>
                        ))}
                        {(() => {
                          const base = (() => {
                            const parts = (selectedDate || "").split("-");
                            if (parts.length === 3) {
                              return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                            }
                            return new Date();
                          })();
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
                                className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${
                                  isSelected ? "border-purple-400 bg-purple-50" : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className={`text-xs md:text-sm font-bold ${isToday ? "text-purple-600" : "text-slate-700"}`}>{d.getDate()}</div>
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
                      .filter((s) => s.date === selectedDate && s.isOpen && (s.current || 0) < (s.max || 0))
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
                    return openSlots.map((slot) => {
                      const isFull = (slot.current || 0) >= slot.max;
                      const canReserve = !isFull;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => canReserve && handleReserve(slot)}
                          disabled={!canReserve}
                          className={`h-20 rounded-2xl border text-sm font-bold flex flex-col items-center justify-center ${
                            canReserve ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
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
        {admissionOpen ? (
          <section className="animate-fade-in-up">
            <a href="/portal/admission" className="block group">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 transform transition-all hover:scale-[1.02]">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold backdrop-blur-sm">필수</span>
                      <h2 className="text-xl font-bold">신규 입학 서류 패키지</h2>
                    </div>
                    <p className="text-blue-100 text-sm mb-4">
                      입학원서, 실태조사서 등 필수 서류를
                      <br />
                      한 번에 제출해주세요.
                    </p>
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
            </a>
          </section>
        ) : (
          <div className="bg-slate-100 rounded-xl p-4 text-center text-slate-500 text-sm">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            <p>
              입학이 확정되면
              <br />
              입학 서류 패키지가 이곳에 표시됩니다.
            </p>
          </div>
        )}

        <section>
          <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            입학 관련 안내
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-700">
            학원에서 곧 연락드려 상담 일정을 확정합니다. 입학 테스트 및 서류 작성은 상담 결과에 따라 진행됩니다.
          </div>
        </section>
      </main>
    </div>
  );
}
