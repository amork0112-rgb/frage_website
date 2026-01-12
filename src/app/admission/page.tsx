// admission/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Calendar, FileCheck, AlertTriangle, UserPlus, ChevronDown, BookOpen, Youtube } from "lucide-react";
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
  const [openIndices, setOpenIndices] = useState<number[]>([]);
  const [selectedStudentIdx, setSelectedStudentIdx] = useState<number>(0);

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
        const admissionStep = String(first?.admissionStep || "not_reserved");
        const current =
          admissionStep === "not_reserved"
            ? "예약 전"
            : admissionStep === "reserved"
            ? "예약 완료 (확인 대기)"
            : admissionStep === "reserved_confirmed"
            ? "예약 확정"
            : admissionStep === "consult_done"
            ? "상담 완료"
            : "승인 완료";
        setCurrentStep(current);
        const statusVal = String(first?.status || "");
        setAdmissionOpen(statusVal === "admission_open");
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

  const refreshAdmissionHome = async () => {
    try {
      const res = await fetch("/api/admission/home", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      const list = Array.isArray(payload?.items) ? payload.items : [];
      setItems(list);
      const first = list[0] || null;
      const admissionStep = String(first?.admissionStep || "not_reserved");
      const current =
        admissionStep === "not_reserved"
          ? "예약 전"
          : admissionStep === "reserved"
          ? "예약 완료 (확인 대기)"
          : admissionStep === "reserved_confirmed"
          ? "예약 확정"
          : admissionStep === "consult_done"
          ? "상담 완료"
          : "승인 완료";
      setCurrentStep(current);
      const statusVal = String(first?.status || "");
      setAdmissionOpen(statusVal === "admission_open");
    } catch {}
  };

  const handleReserve = (slot: any) => {
    if (!confirm(`${slot.date} ${slot.time}에 입학 테스트를 예약하시겠습니까?`)) return;
    (async () => {
      try {
        const selected = items[selectedStudentIdx] || items[0];
        const selectedStudentId = String(selected?.id || "");
        if (!selectedStudentId) {
          alert("학생 정보를 확인할 수 없습니다.");
          return;
        }
        const payload = { slot_id: slot.id, student_id: selectedStudentId };
        console.log("RESERVE PAYLOAD", payload);
        const res = await fetch("/api/admission/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 400) {
          alert("예약 정보가 올바르지 않습니다.");
          return;
        }
        if (res.status === 401) {
          router.replace("/portal");
          return;
        }
        if (res.status === 409) {
          alert("이미 마감된 시간입니다.");
          return;
        }
        if (!res.ok || !data?.ok) {
          alert("예약 처리 중 오류가 발생했습니다.");
          return;
        }
        const refetch = await fetch(`/api/admission/schedules?date=${encodeURIComponent(selectedDate)}`, { cache: "no-store" });
        const refreshed = await refetch.json().catch(() => ({}));
        const refreshedItems = Array.isArray(refreshed?.items) ? refreshed.items : [];
        setAllSlots((prev) => {
          const others = prev.filter((s) => s.date !== selectedDate);
          return [...others, ...refreshedItems];
        });
        await refreshAdmissionHome();
        alert("예약이 완료되었습니다.");
      } catch {
        alert("예약 처리 중 오류가 발생했습니다.");
      }
    })();
  };

  const handleCancelReservation = () => {
    alert("예약 취소는 학원으로 문의해주세요. 캠퍼스 연락처 페이지로 이동합니다.");
    router.push("/campuses");
  };

  const handleChangeReservation = () => {
    alert("예약 변경은 학원으로 문의해주세요. 캠퍼스 연락처 페이지로 이동합니다.");
    router.push("/campuses");
  };

  if (!authChecked) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  const selected = items[selectedStudentIdx] || items[0] || null;
  const selectedStep = String(selected?.admissionStep || "not_reserved");
  const reservedDate = String(selected?.reservation_date || "");
  const reservedTime = String(selected?.reservation_time || "");

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <AdmissionHeader
        currentStep={currentStep}
        studentName={
          Array.isArray(items) && items.length > 0
            ? String(items[selectedStudentIdx]?.student_name || items[0]?.student_name || "")
            : ""
        }
      />
      <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
        <div className="space-y-4">
          {Array.isArray(items) && items.length > 0 ? (
            items.map((it: any, idx: number) => {
              const step = String(it?.admissionStep || "not_reserved") as "not_reserved" | "reserved" | "reserved_confirmed" | "consult_done" | "approved";
              return (
                <div key={String(it?.id || it?.student_name || idx)} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <button
                    onClick={() => {
                      setSelectedStudentIdx(idx);
                      setOpenIndices((prev) =>
                        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                      );
                    }}
                    className="w-full flex items-center justify-between px-5 py-4"
                  >
                    <div className="text-sm font-bold text-slate-900">{it?.student_name || "신규 학생"}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">
                        {step === "not_reserved"
                          ? "예약 전"
                          : step === "reserved"
                          ? "예약 완료 (확인 대기)"
                          : step === "reserved_confirmed"
                          ? "예약 확정"
                          : step === "consult_done"
                          ? "상담 완료"
                          : "입학 승인 완료"}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          openIndices.includes(idx) ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>
                  {openIndices.includes(idx) && (
                    <div className="px-5 pb-5">
                      <StudentInfoCard
                        studentName={it?.student_name || "신규 학생"}
                        englishFirstName={it?.english_first_name || ""}
                        birthDate={it?.child_birth_date || ""}
                        status={String(it?.status || "waiting") as "waiting" | "consulting" | "consulted" | "approved"}
                        campus={it?.campus || undefined}
                        address={it?.address || ""}
                        parentPhone={it?.phone || ""}
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <StudentInfoCard
              studentName="신규 학생"
              englishFirstName=""
              birthDate=""
              status="waiting"
              campus={undefined}
              address=""
              parentPhone=""
            />
          )}
          <button
            onClick={() => {
              const parentName = encodeURIComponent(String(items[0]?.parent_name || ""));
              const phone = encodeURIComponent(String(items[0]?.phone || ""));
              const campus = encodeURIComponent(String(items[0]?.campus || ""));
              router.push(`/signup?sibling=1&parentName=${parentName}&phone=${phone}&campus=${campus}`);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50"
          >
            <UserPlus className="w-4 h-4" />
            형제 추가하기
          </button>
        </div>
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
            {selectedStep === "not_reserved" ? (
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
                                disabled={dateStr < `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`}
                                className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${
                                  dateStr < `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
                                    ? "border-slate-200 bg-slate-100 cursor-not-allowed"
                                    : isSelected
                                    ? "border-purple-400 bg-purple-50"
                                    : "border-slate-200 bg-white"
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
                                disabled={dateStr < `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`}
                                className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${
                                  dateStr < `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
                                    ? "border-slate-200 bg-slate-100 cursor-not-allowed"
                                    : isSelected
                                    ? "border-purple-400 bg-purple-50"
                                    : "border-slate-200 bg-white"
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
                      .filter((s) => s.date === selectedDate)
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
                        const canReserve = !isFull && !(selectedDate < `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`);
                        return (
                          <button
                            key={slot.id}
                            onClick={() => {
                              if (canReserve) handleReserve(slot);
                            }}
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
            ) : (
              <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-purple-200 text-purple-700 text-xs font-bold mb-2">
                      {selectedStep === "reserved_confirmed" ? "예약 확정" : "예약 완료"}
                    </span>
                    <h4 className="text-lg font-bold text-slate-800">
                      {selectedStep === "reserved_confirmed"
                        ? "입학 테스트 일정이 확정되었습니다."
                        : "예약이 완료되었습니다. 확인 후 확정 안내가 발송됩니다."}
                    </h4>
                    <p className="text-slate-600 mt-1">
                      {reservedDate} {reservedTime}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 font-bold">
                      {selectedStep === "reserved_confirmed" ? "상담 예정 확정" : "상담 확인 대기"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">* 변경이 필요하시면 학원으로 문의해주세요.</p>
                  </div>
                  {/* 예약 취소/변경 버튼 제거 */}
                </div>
              </div>
            )}
          </section>
        )}
        
        {(selectedStep === "reserved" || selectedStep === "reserved_confirmed") && (
          <section className="animate-fade-in-up">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                상담 전 간단한 설문이 있습니다
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                상담을 더 정확하게 준비하기 위한 질문입니다. (약 2분)
              </p>
              <button
                onClick={() => {
                  const sel = items[selectedStudentIdx] || items[0];
                  const sid = String(sel?.id || "");
                  if (!sid) {
                    alert("학생 정보를 확인할 수 없습니다.");
                    return;
                  }
                  router.push(`/admission/${sid}/survey`);
                }}
                className="w-full mt-4 px-4 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700"
              >
                상담 전 설문 작성하러 가기 →
              </button>
            </div>
          </section>
        )}
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
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://blog.naver.com/prologue/PrologueList.naver?blogId=frage_2030&skinType=&skinId=&from=menu&userSelectMenu=true"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 hover:border-purple-500 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900">프라게 블로그 구경하기</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">교육 철학과 학원 소식을 확인하세요</div>
              </div>
            </a>
            <a
              href="https://www.youtube.com/@FRAGE_Edu/featured"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 hover:border-red-500 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Youtube className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900">프라게 유튜브 구경하기</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">프라게 TV에서 프로그램과 콘텐츠를 보세요</div>
              </div>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
