"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Check, AlertCircle, ChevronDown, ChevronUp, Search, Calendar, Phone, Plus, UserPlus, StickyNote, ChevronLeft, ChevronRight } from "lucide-react";
import { CAMPUS_CONFIG } from "@/config/campus";

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
  englishFirstName?: string;
  passportEnglishName?: string;
  childBirthDate?: string;
  address?: string;
  addressDetail?: string;
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

export default function AdminNewStudentsPage() {
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
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [checklists, setChecklists] = useState<Record<string, StudentChecklist>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCampus, setFilterCampus] = useState("All");
  const [memoEditingId, setMemoEditingId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState("");
  
  // Reservation Management State
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationSlots, setReservationSlots] = useState<{id: string, date: string, time: string, max: number, current: number, isOpen: boolean}[]>([]);
  const [studentReservations, setStudentReservations] = useState<Record<string, any>>({});
  const [newSlotTime, setNewSlotTime] = useState("");
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => fmtYMD(new Date()));
  const [daySlots, setDaySlots] = useState<{id: string, date: string, time: string, max: number, current: number, isOpen: boolean}[]>([]);
  const [loadingDaySlots, setLoadingDaySlots] = useState(false);
  const [errorDaySlots, setErrorDaySlots] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const inFlightDatesRef = useRef<Set<string>>(new Set());
  const inFlightMonthRef = useRef<string | null>(null);
  const DEFAULT_TIMES = useMemo(() => {
    const times: string[] = [];
    for (let h = 10; h <= 20; h++) {
      times.push(`${String(h).padStart(2, "0")}:00`);
    }
    return times;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/new-students", { cache: "no-store" });
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        items.sort((a: any, b: any) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime());
        setStudents(items);
        setChecklists(data?.checklists || {});
        setStudentReservations(data?.reservations || {});
      } catch (e) {}
    };
    load();
  }, []);
  useEffect(() => {
    const loadAll = async () => {
      try {
        const res = await fetch("/api/admin/schedules");
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        setReservationSlots(items);
      } catch {}
    };
    loadAll();
    const t = setInterval(loadAll, 5000);
    return () => clearInterval(t);
  }, []);

  const fetchDaySlots = async (date: string) => {
    setLoadingDaySlots(true);
    setErrorDaySlots(null);
    try {
      const res = await fetch(`/api/admin/schedules?date=${encodeURIComponent(date)}`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setDaySlots(items);
    } catch {
      setErrorDaySlots("일정 데이터를 불러오지 못했습니다.");
    } finally {
      setLoadingDaySlots(false);
    }
  };

  useEffect(() => {
    if (showCalendar) {
      ensureDefaultWeekdaySlotsForMonth(currentMonth);
    }
  }, [showCalendar, currentMonth]);

  useEffect(() => {
    if (showReservationModal) {
      fetchDaySlots(selectedDate);
      const t = setInterval(() => fetchDaySlots(selectedDate), 5000);
      return () => clearInterval(t);
    }
  }, [showReservationModal, selectedDate]);

  const addDaySlot = async () => {
    if (!selectedDate || !newSlotTime) return alert("시간을 입력해주세요.");
    try {
      const res = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, time: newSlotTime, max: 5, current: 0, isOpen: true })
      });
      if (res.status === 409) {
        alert("중복 일정이 있습니다.");
        return;
      }
      await fetchDaySlots(selectedDate);
      setNewSlotTime("");
    } catch {}
  };

  const deleteDaySlot = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await fetch("/api/admin/schedules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      await fetchDaySlots(selectedDate);
    } catch {}
  };

  const toggleDaySlot = async (id: string, next: boolean) => {
    try {
      await fetch("/api/admin/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isOpen: next })
      });
      await fetchDaySlots(selectedDate);
    } catch {}
  };
  
  const refreshAllSchedules = async () => {
    try {
      const res = await fetch("/api/admin/schedules");
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setReservationSlots(items);
    } catch {}
  };
  
  const ensureDefaultDaySlots = async (date: string) => {
    if (inFlightDatesRef.current.has(date)) return;
    inFlightDatesRef.current.add(date);
    try {
      const res = await fetch(`/api/admin/schedules?date=${encodeURIComponent(date)}`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const existing = new Set(items.map((s: any) => s.time));
      for (const t of DEFAULT_TIMES) {
        if (!existing.has(t)) {
          const r = await fetch("/api/admin/schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date, time: t, max: 5, current: 0, isOpen: true })
          });
          if (r.status === 409) {
            continue;
          }
        }
      }
      await refreshAllSchedules();
      await fetchDaySlots(date);
    } catch {} finally {
      inFlightDatesRef.current.delete(date);
    }
  };
  
  const ensureDefaultWeekdaySlotsForMonth = async (month: Date) => {
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    if (inFlightMonthRef.current === key) return;
    inFlightMonthRef.current = key;
    try {
      const start = new Date(month.getFullYear(), month.getMonth(), 1);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const startStr = fmtYMD(start);
      const endStr = fmtYMD(end);
      const res = await fetch(`/api/admin/schedules?rangeStart=${encodeURIComponent(startStr)}&rangeEnd=${encodeURIComponent(endStr)}`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const byDate: Record<string, Set<string>> = {};
      items.forEach((s: any) => {
        if (!byDate[s.date]) byDate[s.date] = new Set();
        byDate[s.date].add(s.time);
      });
      for (let d = 1; d <= end.getDate(); d++) {
        const curr = new Date(month.getFullYear(), month.getMonth(), d);
        const day = curr.getDay(); // 0=Sun..6=Sat
        if (day === 0 || day === 6) continue; // weekdays only
        const dateStr = fmtYMD(curr);
        const set = byDate[dateStr] || new Set<string>();
        for (const t of DEFAULT_TIMES) {
          if (!set.has(t)) {
            const r = await fetch("/api/admin/schedules", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date: dateStr, time: t, max: 5, current: 0, isOpen: true })
            });
            if (r.status === 409) {
              continue;
            }
          }
        }
      }
      await refreshAllSchedules();
    } catch {} finally {
      inFlightMonthRef.current = null;
    }
  };

  const deleteAllDaySlots = async () => {
    try {
      const res = await fetch(`/api/admin/schedules?date=${encodeURIComponent(selectedDate)}`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      for (const slot of items) {
        await fetch("/api/admin/schedules", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: slot.id })
        });
      }
      await fetchDaySlots(selectedDate);
      await refreshAllSchedules();
    } catch {}
  };

  const deleteWeekdaySlotsForMonth = async (month: Date) => {
    try {
      const start = new Date(month.getFullYear(), month.getMonth(), 1);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const startStr = fmtYMD(start);
      const endStr = fmtYMD(end);
      const res = await fetch(`/api/admin/schedules?rangeStart=${encodeURIComponent(startStr)}&rangeEnd=${encodeURIComponent(endStr)}`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const targets = items.filter((s: any) => {
        const [y, m, d] = s.date.split("-").map((v: string) => parseInt(v, 10));
        const dt = new Date(y, m - 1, d);
        const day = dt.getDay();
        return day !== 0 && day !== 6;
      });
      for (const slot of targets) {
        await fetch("/api/admin/schedules", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: slot.id })
        });
      }
      await refreshAllSchedules();
    } catch {}
  };

  const toggleCheck = async (studentId: string, stepKey: string, stepLabel: string) => {
    const currentList = checklists[studentId] || {};
    const currentItem = currentList[stepKey] || { key: stepKey, label: stepLabel, checked: false };
    
    const nextItem = {
      ...currentItem,
      checked: !currentItem.checked,
      date: !currentItem.checked ? new Date().toISOString() : undefined,
      by: !currentItem.checked ? "Teacher" : undefined // In real app, use actual user role
    };

    const nextList = {
      ...currentList,
      [stepKey]: nextItem
    };

    const nextChecklists = {
      ...checklists,
      [studentId]: nextList
    };

    setChecklists(nextChecklists);
    try {
      await fetch("/api/admin/new-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          key: stepKey,
          checked: nextItem.checked,
          date: nextItem.date,
          by: nextItem.by,
        }),
      });
    } catch {}

      // Trigger Logic (Automations)
    if (nextItem.checked) {
      if (stepKey === "consultation_confirmed") {
        // Find reservation
        const reservation = studentReservations[studentId];
        let eventDate = new Date().toISOString().split('T')[0];
        let eventTime = "";
        let hasReservation = false;

        if (reservation && reservation.date && reservation.date.includes("-")) {
             eventDate = reservation.date;
             eventTime = reservation.time;
             hasReservation = true;
        }

        // Google Calendar Logic
        const student = students.find(s => s.id === studentId);
        const title = `[신규상담] ${student?.studentName || '학생'} (${student?.parentName || '학부모'})`;
        const details = `연락처: ${student?.phone || '없음'}`;
        
        let dates = "";
        if (hasReservation) {
            // Local Time Formatting Helper
            const fmt = (dt: Date) => {
              const y = dt.getFullYear();
              const m = String(dt.getMonth() + 1).padStart(2, '0');
              const d = String(dt.getDate()).padStart(2, '0');
              const h = String(dt.getHours()).padStart(2, '0');
              const min = String(dt.getMinutes()).padStart(2, '0');
              const s = String(dt.getSeconds()).padStart(2, '0');
              return `${y}${m}${d}T${h}${min}${s}`;
            };

            const startDt = new Date(`${eventDate}T${eventTime}:00`);
            const endDt = new Date(startDt.getTime() + 60 * 60 * 1000); // 1 hour duration
            dates = `${fmt(startDt)}/${fmt(endDt)}`;
        } else {
            // All day event for today
            const d = new Date().toISOString().split('T')[0].replace(/-/g, "");
            dates = `${d}/${d}`;
        }

        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${dates}`;
        
        // Open in new tab
        window.open(googleCalendarUrl, '_blank');

        alert(`✅ [구글 캘린더] 상담 일정 등록 팝업을 띄웠습니다.\n저장 버튼을 눌러 일정을 등록해주세요.`);
      }
      if (stepKey === "admission_confirmed") {
        alert("✅ [자동화] 입학 확정 -> 학부모용 '입학 서류 패키지'가 오픈되었습니다.");
      }
      if (stepKey === "consultation_msg") {
        try {
          const student = students.find(s => s.id === studentId);
          const reservation = studentReservations[studentId];
          const campusKey = student?.campus || "International";
          const campus = CAMPUS_CONFIG[campusKey] || CAMPUS_CONFIG.International;
          const text = reservation?.date && reservation?.time
            ? `상담 안내: ${reservation.date} ${reservation.time} 일정이 확정되었습니다.`
            : "상담 안내 메시지가 발송되었습니다.";
          fetch("/api/portal/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, message: text })
          }).catch(() => {});
          fetch("/api/hooks/consultation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message_type: "consultation_confirm",
              student_id: studentId,
              student_name: student?.studentName,
              parent_name: student?.parentName,
              phone: student?.phone,
              date: reservation?.date,
              time: reservation?.time,
              campus_name: campus.name,
              address: campus.address,
              contact_phone: campus.contact_phone,
            })
          }).catch(() => {});
          alert(`✅ ${campus.name} 상담 안내가 발송되었습니다.`);
        } catch {
          alert("상담 안내 발송 중 오류가 발생했습니다.");
        }
      }
      if (stepKey === "consultation_msg") {
        try {
          const student = students.find(s => s.id === studentId);
          const reservation = studentReservations[studentId];
          const text = reservation?.date && reservation?.time
            ? `상담 안내: ${reservation.date} ${reservation.time} 일정 안내가 발송되었습니다.`
            : "상담 안내 메시지가 발송되었습니다.";
          fetch("/api/portal/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, message: text })
          }).then(() => {
            alert("✅ 학부모 포털 공지(앱푸시)로 상담 안내가 발송되었습니다.");
          }).catch(() => {
            alert("상담 안내 앱푸시 발송 중 오류가 발생했습니다.");
          });
        } catch {
          alert("상담 안내 앱푸시 발송 중 오류가 발생했습니다.");
        }
      }
      if (stepKey === "band_invite") {
         const today = new Date();
         // Just a mock check
        alert("✅ 밴드 초대 링크가 발송되었습니다. (입학 전날 원칙 준수 요망)");
      }
      if (stepKey === "docs_submitted") {
        try {
          await fetch("/api/admin/new-students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update_status", studentId, status: "enrolled" }),
          });
          const prof = students.find((p: any) => p.id === studentId) || null;
          if (prof) {
            const item = {
              id: `signup_${(prof.phone || "").replace(/[^0-9a-zA-Z]/g, "")}`,
              childId: undefined,
              name: String(prof.studentName || ""),
              englishName: String(prof.englishFirstName || prof.passportEnglishName || ""),
              birthDate: String(prof.childBirthDate || ""),
              phone: String(prof.phone || ""),
              className: "미배정",
              campus: String(prof.campus || "미지정"),
              status: "재원",
              parentName: String(prof.parentName || ""),
              parentAccountId: String(prof.id || ""),
              address: [String(prof.address || ""), String(prof.addressDetail || "")].filter(Boolean).join(" "),
              bus: "미배정",
              departureTime: ""
            };
            fetch("/api/admin/students", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: [item] })
            }).catch(() => {});
            alert("✅ 입학 서류 완료 처리 • 원생 관리에 등록되었습니다.");
          }
        } catch {}
      }
    }
  };

  const filteredStudents = students.filter(s => 
    filterCampus === "All" || s.campus === filterCampus
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              신규생 관리 (입학 프로세스)
              <span className="text-xs font-normal text-white bg-blue-600 px-2 py-0.5 rounded-full">Step 1~7</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">문의부터 입학 사후관리까지 원스톱 처리</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${viewMode === "month" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"}`}
                aria-pressed={viewMode === "month"}
              >
                월간
              </button>
              <button 
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${viewMode === "week" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"}`}
                aria-pressed={viewMode === "week"}
              >
                주간
              </button>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => {
                    const d = new Date(currentMonth);
                    d.setMonth(d.getMonth() - 1);
                    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  }}
                  className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                  aria-label="이전 달"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const d = new Date(currentMonth);
                    d.setMonth(d.getMonth() + 1);
                    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  }}
                  className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                  aria-label="다음 달"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
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
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-bold text-slate-800 mb-2">신규생 관리 사용 가이드</p>
          <div className="text-xs text-slate-600 space-y-1">
            <p>1) 상단 달력을 열고 날짜를 클릭하면 주중 기본 11개 시간대가 자동 오픈됩니다.</p>
            <p>2) 상담 일정 확정 체크 시 구글 캘린더 팝업으로 등록하세요.</p>
            <p>3) STEP 3 문서 완료 체크 시 자동 재원 등록됩니다.</p>
            <p>4) 시간대는 필요 시 마감으로 변경해 닫을 수 있습니다.</p>
            <p>5) 주말은 자동 오픈 제외이며 필요 시 수동 추가하세요.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-8">
            <div className="p-4 flex items-center justify-between">
              <div className="font-bold text-slate-900">
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </div>
              <button
              onClick={() => setShowCalendar(prev => !prev)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
                aria-controls="calendar-section"
                aria-expanded={showCalendar}
              >
                <Calendar className="w-4 h-4" />
                선택 날짜 일정 관리
              </button>
              <button
                onClick={() => deleteWeekdaySlotsForMonth(currentMonth)}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-bold"
                aria-label="월간 기본 시간대 삭제"
              >
                전체 주중 시간대 삭제
              </button>
            </div>
            {showCalendar && (
              <div className="px-4 pb-2 text-[11px] text-slate-500">주중(월~금)은 기본 11개 시간대가 자동 오픈됩니다.</div>
            )}
          {showCalendar && (
          <div className="p-4 pt-0" id="calendar-section">
            {viewMode === "month" ? (
              <div role="grid" aria-label="월간 달력" className="grid grid-cols-7 gap-2">
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
                        role="gridcell"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setShowReservationModal(true);
                          ensureDefaultDaySlots(dateStr);
                        }}
                        className={`h-16 md:h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                      >
                        <div className={`text-xs md:text-sm font-bold ${isToday ? "text-blue-600" : "text-slate-700"}`}>
                          {day}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                          {reservationSlots.filter(s => s.date === dateStr && s.isOpen).length}개 오픈
                        </div>
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
            ) : (
              <div role="grid" aria-label="주간 달력" className="grid grid-cols-7 gap-2">
                {["일","월","화","수","목","금","토"].map((d) => (
                  <div key={d} className="text-xs font-bold text-slate-400 text-center">{d}</div>
                ))}
                {(() => {
                  const base = parseYMD(selectedDate);
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
                        role="gridcell"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setShowReservationModal(true);
                          ensureDefaultDaySlots(dateStr);
                        }}
                        className={`h-16 md:h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                      >
                        <div className={`text-xs md:text-sm font-bold ${isToday ? "text-blue-600" : "text-slate-700"}`}>
                          {d.getDate()}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                          {reservationSlots.filter(s => s.date === dateStr && s.isOpen).length}개 오픈
                        </div>
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
            )}
          </div>
          )}
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
              const reservation = studentReservations[student.id];
              const reservedText = reservation && reservation.date && reservation.time ? `${reservation.date} ${reservation.time}` : null;
              
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
                      {(() => {
                        const st = student.status || (student.id.startsWith("manual_") ? "대기" : "대기");
                        const enrolled = st === "enrolled" || st === "재원";
                        return (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${enrolled ? "text-white bg-green-600" : "text-white bg-slate-400"}`}>
                            {st}
                          </span>
                        );
                      })()}
                      {reservedText && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {reservedText}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="선택 날짜 일정 관리">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {selectedDate} 일정
              </h3>
              <button onClick={() => setShowReservationModal(false)} className="text-slate-400 hover:text-slate-600">
                <AlertCircle className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-sm font-bold text-blue-800 mb-3">시간 추가</h4>
                <div className="flex gap-2">
                  <input 
                    type="time" 
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="w-32 px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={addDaySlot}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                  >
                    추가
                  </button>
                  <button
                    onClick={deleteAllDaySlots}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                  >
                    선택 날짜 전체 삭제
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <h4 className="text-sm font-bold text-slate-700">등록된 시간대 ({daySlots.length})</h4>
                {loadingDaySlots ? (
                  <p className="text-center text-slate-400 text-sm py-4">로딩중...</p>
                ) : errorDaySlots ? (
                  <p className="text-center text-red-500 text-sm py-4">{errorDaySlots}</p>
                ) : daySlots.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4">시간대가 없습니다.</p>
                ) : (
                  daySlots.map(slot => (
                    <div key={slot.id} className={`flex items-center justify-between p-2 rounded-lg border ${slot.isOpen ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${slot.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <div className="font-bold text-slate-800 text-xs md:text-sm">
                            {slot.time}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => toggleDaySlot(slot.id, !slot.isOpen)}
                          className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold border transition-all ${
                            slot.isOpen 
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${slot.isOpen ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                          {slot.isOpen ? "접수중" : "마감됨"}
                        </button>
                        <button 
                          onClick={() => deleteDaySlot(slot.id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                          title="삭제"
                        >
                          <Search className="w-4 h-4 rotate-45" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
