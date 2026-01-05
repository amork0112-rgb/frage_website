"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, X, ChevronDown, ChevronUp, Search, Calendar, Phone, Plus, UserPlus, StickyNote } from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";

type StudentProfile = {
  id: string;
  studentName: string;
  gender: string;
  parentName: string;
  phone: string;
  campus?: string;
  createdAt: string;
  status?: string; // 'waiting', 'consultation', 'admitted', etc.
  memo?: string; // New memo field
};

type ChecklistItem = {
  key: string;
  label: string;
  checked: boolean;
  date?: string;
  by?: string; 
};

type StudentChecklist = {
  [key: string]: ChecklistItem;
};

// Updated Workflow Steps based on User Request
const WORKFLOW_STEPS = [
  {
    id: "step1",
    title: "STEP 1. 상담 예약 & 진행",
    color: "bg-purple-500",
    items: [
      { key: "schedule_check", label: "상담 가능 요일/시간 확인", role: "행정" },
      { key: "director_calendar", label: "원장님 캘린더 일정 확인", role: "행정" },
      { key: "consultation_confirmed", label: "상담 일정 확정", role: "행정" },
      { key: "consultation_msg", label: "상담 안내 메시지 발송", role: "행정" },
      { key: "calendar_record", label: "캘린더 기록 완료", role: "행정" },
    ]
  },
  {
    id: "step2",
    title: "STEP 2. 상담 후 입학 결정",
    color: "bg-blue-500",
    items: [
      { key: "admission_confirmed", label: "입학 확정 여부 체크", role: "원장" },
      { key: "admission_date", label: "입학 예정일 입력", role: "행정" },
      { key: "homeroom_assign", label: "한인영어 담임 배정", role: "부원장" },
      { key: "native_assign", label: "원어민 교사 공유 완료", role: "부원장" },
      { key: "transfer_list", label: "편입생 리스트 반영", role: "행정" },
    ]
  },
  {
    id: "step3",
    title: "STEP 3. 입학 서류 (전자서명 패키지)",
    color: "bg-indigo-500",
    items: [
      { key: "docs_submitted", label: "학부모 서류 제출 완료 확인", role: "행정" },
      // Actual items are handled by parent, admin just sees "Complete"
    ]
  },
  {
    id: "step4",
    title: "STEP 4. 입학 준비 (행정 & 담임)",
    color: "bg-teal-500",
    items: [
      { key: "textbook_list", label: "교재 리스트 작성", role: "한인담임" },
      { key: "supplies_check", label: "준비물 리스트 확인", role: "한인담임" },
      { key: "native_share", label: "원어민 교사 공유", role: "한인담임" },
      { key: "smartstore_msg", label: "스마트스토어 안내 발송", role: "행정" },
      { key: "uniform_msg", label: "원복/체육복 주문 안내", role: "행정" },
      { key: "milk_msg", label: "우유 신청 안내", role: "행정" },
    ]
  },
  {
    id: "step5",
    title: "STEP 5. 차량 & 등하원",
    color: "bg-orange-500",
    items: [
      { key: "transport_choice", label: "차량/자가 등원 선택", role: "행정" },
      { key: "transport_fix", label: "차량 시간/호차 확정", role: "차량" },
      { key: "transport_notice", label: "차량방 공지", role: "행정" },
      { key: "transport_call", label: "차량선생님 통화 기록", role: "차량" },
    ]
  },
  {
    id: "step6",
    title: "STEP 6. 입학 전날",
    color: "bg-red-500",
    items: [
      { key: "band_invite", label: "밴드 초대 링크 발송", role: "행정" },
      { key: "final_notice", label: "입학 안내 최종 발송", role: "행정" },
      { key: "time_notice", label: "입학 시간 재안내", role: "행정" },
    ]
  },
  {
    id: "step7",
    title: "STEP 7. 입학 당일 & 사후 관리",
    color: "bg-green-500",
    items: [
      { key: "first_greeting", label: "담임 인사", role: "한인담임" },
      { key: "photo_taken", label: "사진 촬영", role: "교사" },
      { key: "happy_call_1", label: "1차 해피콜", role: "담임" },
      { key: "happy_call_2_reserve", label: "2차 해피콜 예약", role: "행정" },
      { key: "band_check", label: "밴드 정상 확인", role: "행정" },
    ]
  }
];

export default function TeacherNewStudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [checklists, setChecklists] = useState<Record<string, StudentChecklist>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCampus, setFilterCampus] = useState("All");
  const [memoEditingId, setMemoEditingId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  
  // Reservation Management State
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationSlots, setReservationSlots] = useState<{id: string, date: string, time: string, max: number, current: number, isOpen: boolean}[]>([]);
  const [studentReservations, setStudentReservations] = useState<Record<string, any>>({});
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("");
  const [selectedDateGrid, setSelectedDateGrid] = useState("");

  useEffect(() => {
    // Load students
    try {
      (async () => {
        if (supabaseReady) {
          const { data } = await supabase.auth.getUser();
          setTeacherId(data?.user?.id || null);
        }
        const { data } = await supabase
          .from("signup_requests")
          .select("*")
          .order("created_at", { ascending: false });
        const mapped: StudentProfile[] = Array.isArray(data)
          ? data.map((r: any) => ({
              id: String(r.id),
              studentName: String(r.studentName || r.childName || ""),
              gender: String(r.gender || ""),
              parentName: String(r.parentName || ""),
              phone: String(r.phone || ""),
              campus: String(r.campus || ""),
              createdAt: String(r.created_at || ""),
              status: String(r.status || "waiting"),
              memo: String(r.memo || ""),
            }))
          : [];
        setStudents(mapped);
        try {
          const res = await fetch("/api/admin/new-students", { cache: "no-store" });
          const all = await res.json();
          const checks = all?.checklists || {};
          const reservations = all?.reservations || {};
          setChecklists(checks);
          setStudentReservations(reservations);
        } catch {}
      })();
      
      let dt = new Date();
      while (dt.getDay() === 0 || dt.getDay() === 6) {
        dt.setDate(dt.getDate() + 1);
      }
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      setSelectedDateGrid(`${y}-${m}-${d}`);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!selectedDateGrid) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/schedules?date=${encodeURIComponent(selectedDateGrid)}`, { cache: "no-store" });
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        setReservationSlots(items);
      } catch {
        setReservationSlots([]);
      }
    })();
  }, [selectedDateGrid]);

  const handleToggleCell = (time: string) => {
    const existing = reservationSlots.find(s => s.date === selectedDateGrid && s.time === time);
    if (existing) {
      fetch("/api/admin/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existing.id, isOpen: !existing.isOpen })
      })
      .then(() => {
        setReservationSlots(prev => prev.map(s => s.id === existing.id ? { ...s, isOpen: !existing.isOpen } : s));
      })
      .catch(() => {});
    } else {
      fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDateGrid, time, max: 1, current: 0, isOpen: true })
      })
      .then(async () => {
        const res = await fetch(`/api/admin/schedules?date=${encodeURIComponent(selectedDateGrid)}`, { cache: "no-store" });
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        setReservationSlots(items);
      })
      .catch(() => {});
    }
  };

  const handleDeleteSlot = (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    fetch("/api/admin/schedules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    })
    .then(async () => {
      const res = await fetch(`/api/admin/schedules?date=${encodeURIComponent(selectedDateGrid)}`, { cache: "no-store" });
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setReservationSlots(items);
    })
    .catch(() => {});
  };

  const toggleSlotStatus = (id: string) => {
    const slot = reservationSlots.find(s => s.id === id);
    const next = slot ? !slot.isOpen : true;
    fetch("/api/admin/schedules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isOpen: next })
    })
    .then(() => {
      setReservationSlots(prev => prev.map(s => s.id === id ? { ...s, isOpen: next } : s));
    })
    .catch(() => {});
  };

  const toggleCheck = async (studentId: string, stepKey: string, stepLabel: string) => {
    const currentList = checklists[studentId] || {};
    const currentItem = currentList[stepKey] || { key: stepKey, label: stepLabel, checked: false };
    const nextChecked = !currentItem.checked;
    const nextCheckedAt = nextChecked ? new Date().toISOString() : undefined;
    try {
      if (supabaseReady) {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id || null;
        await supabase.from("new_student_checklists").upsert({
          student_id: studentId,
          key: stepKey,
          checked: nextChecked,
          checked_at: nextCheckedAt,
          checked_by: uid,
        });
        const { data: rows } = await supabase
          .from("new_student_checklists")
          .select("*")
          .eq("student_id", studentId);
        const map: StudentChecklist = {};
        (rows || []).forEach((row: any) => {
          map[row.key] = {
            key: row.key,
            label: stepLabel,
            checked: !!row.checked,
            date: row.checked_at || undefined,
            by: row.checked_by || undefined,
          };
        });
        setChecklists(prev => ({ ...prev, [studentId]: map }));
      }
    } catch {}

    // Trigger Logic (Automations)
    if (nextChecked) {
      if (stepKey === "consultation_confirmed") {
        // handled by server
      }
      if (stepKey === "admission_confirmed") {
        // handled by server
      }
      if (stepKey === "consultation_msg") {
        try {
          const reservation = studentReservations[studentId];
          const text = reservation?.date && reservation?.time
            ? `상담 안내: ${reservation.date} ${reservation.time} 일정 안내가 발송되었습니다.`
            : "상담 안내 메시지가 발송되었습니다.";
          fetch("/api/portal/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, message: text })
          }).then(() => {
          }).catch(() => {
          });
        } catch {
        }
      }
      if (stepKey === "docs_submitted") {
        try {
          const prof = students.find((s) => s.id === studentId) || null;
          await supabase.from("signup_requests").update({ status: "enrolled" }).eq("id", studentId);
          if (prof) {
            const item = {
              id: `signup_${(prof.phone || "").replace(/[^0-9a-zA-Z]/g, "")}`,
              name: String(prof.studentName || ""),
              phone: String(prof.phone || ""),
              className: "미배정",
              campus: String(prof.campus || "미지정"),
              status: "재원",
              parentName: String(prof.parentName || ""),
              bus: "미배정",
              departureTime: ""
            };
            await supabase.from("students").insert(item);
          }
        } catch {}
      }
      if (stepKey === "band_invite") {
         const today = new Date();
         // Just a mock check
      }
    }
  };

  const filteredStudents = students.filter(s => 
    filterCampus === "All" || s.campus === filterCampus
  );

  const dismissGuide = () => {
    setShowGuide(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {showGuide && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-900 font-bold">
                <StickyNote className="w-4 h-4" />
                교사용 신규생 관리 가이드
              </div>
              <button
                onClick={dismissGuide}
                className="text-xs font-bold text-yellow-800 bg-yellow-100 px-3 py-1 rounded-full border border-yellow-200"
              >
                다시 보지 않기
              </button>
            </div>
            <div className="mt-3 text-sm text-yellow-900 space-y-1">
              <div>1. 상단의 ‘입학 테스트 예약 관리’ 버튼으로 예약 팝업을 열어 일정 추가/열기/닫기를 관리하세요.</div>
              <div>2. 예약 팝업에서 일정의 ‘열기/닫기’ 버튼으로 접수 가능 여부를 설정하세요.</div>
              <div>3. 아래 신규생 카드에서 STEP 1~7 체크리스트로 진행 상태를 업데이트하세요.</div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              신규생 관리 (입학 프로세스)
              <span className="text-xs font-normal text-white bg-blue-600 px-2 py-0.5 rounded-full">Step 1~7</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">문의부터 입학 사후관리까지 원스톱 처리</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowReservationModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              입학 테스트 예약 관리
            </button>
            <select 
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold bg-white outline-none focus:border-blue-500"
            >
              <option value="All">전체 캠퍼스</option>
              <option value="International">International</option>
              <option value="Andover">Andover</option>
              <option value="Platz">Platz</option>
              <option value="Atheneum">Atheneum</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">등록된 학생이 없습니다.</p>
            </div>
          ) : (
            filteredStudents.map(student => {
              const studentChecklist = checklists[student.id] || {};
              const isExpanded = expandedId === student.id;
              
              // Progress calculation (Total items across all steps)
              const allItems = WORKFLOW_STEPS.flatMap(s => s.items);
              const totalSteps = allItems.length;
              const completedSteps = Object.values(studentChecklist).filter(i => i.checked).length;
              const progress = Math.round((completedSteps / totalSteps) * 100);

              return (
                <div key={student.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : student.id)}
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-lg">
                        {student.studentName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-lg">{student.studentName}</h3>
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {student.campus || "미지정"}
                          </span>
                          {student.id.startsWith("manual_") && (
                            <span className="text-[10px] font-bold text-white bg-slate-400 px-1.5 py-0.5 rounded">
                              대기
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 font-medium mt-0.5">
                          {student.gender === "M" ? "남" : "여"} • {student.parentName} ({student.phone})
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-slate-400 mb-1">전체 진행률</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="text-sm font-black text-blue-600">{progress}%</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 pt-0 border-t border-slate-100 bg-slate-50/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-6">
                        {WORKFLOW_STEPS.map((step) => (
                          <div key={step.id} className="flex flex-col">
                            <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${step.color}`}></span>
                              {step.title}
                            </h4>
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1 shadow-sm">
                              {step.items.map((item, idx) => {
                                const checklistItem = studentChecklist[item.key];
                                const isChecked = checklistItem?.checked;
                                
                                return (
                                  <div key={item.key} className={`flex items-start gap-3 p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${isChecked ? 'bg-blue-50/30' : ''}`}>
                                    <button
                                      onClick={() => toggleCheck(student.id, item.key, item.label)}
                                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}
                                    >
                                      {isChecked && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                    <div className="flex-1">
                                      <div className="flex justify-between items-start">
                                        <span className={`text-sm font-medium block leading-tight ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                                          {item.label}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between mt-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {item.role}
                                        </span>
                                        {isChecked && (
                                          <span className="text-[10px] text-blue-400">
                                            {new Date(checklistItem.date!).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      {/* Reservation Management Modal */}
      {showReservationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                입학 테스트 일정 관리
              </h3>
              <button onClick={() => setShowReservationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              

              {/* Slot List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <h4 className="text-sm font-bold text-slate-700">등록된 일정 ({reservationSlots.length})</h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(() => {
                    const arr: {dateStr: string; day: string; week: string}[] = [];
                    let dt = new Date();
                    while (arr.length < 8) {
                      if (dt.getDay() !== 0 && dt.getDay() !== 6) {
                        const y = dt.getFullYear();
                        const m = String(dt.getMonth() + 1).padStart(2, '0');
                        const day = String(dt.getDate()).padStart(2, '0');
                        const dateStr = `${y}-${m}-${day}`;
                        const week = ["일","월","화","수","목","금","토"][dt.getDay()];
                        arr.push({ dateStr, day, week });
                      }
                      dt.setDate(dt.getDate() + 1);
                    }
                    return arr.map(({dateStr, day, week}) => {
                      const active = selectedDateGrid === dateStr;
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDateGrid(dateStr)}
                          className={`flex flex-col items-center justify-center w-16 h-20 rounded-2xl font-bold border transition-all ${
                            active ? "bg-purple-600 text-white border-purple-600 shadow-lg" : "bg-white text-slate-600 border-slate-200"
                          }`}
                        >
                          <span className={`text-xs ${active ? "text-white/90" : "text-slate-400"}`}>{week}</span>
                          <span className="text-lg">{day}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(() => {
                    const baseTimes = ["10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];
                    const map = new Map<string, any>();
                    reservationSlots.forEach(s => {
                      if (s.date === selectedDateGrid) {
                        map.set(s.time, s);
                      }
                    });
                    return baseTimes.map(t => {
                      const slot = map.get(t);
                      const isOpen = slot ? slot.isOpen : false;
                      let reservedName = "";
                      if (slot) {
                        for (const sid of Object.keys(studentReservations || {})) {
                          const res = studentReservations[sid];
                          if (res && ((res.slotId && res.slotId === slot.id) || (res.date === slot.date && res.time === slot.time))) {
                            const stu = students.find(s => s.id === sid);
                            reservedName = stu?.studentName || "";
                            break;
                          }
                        }
                      }
                      return (
                        <button
                          key={t}
                          onClick={() => handleToggleCell(t)}
                          className={`h-20 rounded-2xl border text-sm font-bold flex flex-col items-center justify-center ${
                            slot
                              ? (isOpen ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100" : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200")
                              : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          <span>{t}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{slot ? `신청 ${slot.current || 0}/1` : "-"}</span>
                            {reservedName ? (
                              <span className="text-[10px] font-bold text-green-700">신청됨 ({reservedName})</span>
                            ) : (
                              <span className="text-[10px] font-bold">{isOpen ? "신청가능" : "신청불가"}</span>
                            )}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
