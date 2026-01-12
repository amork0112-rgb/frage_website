"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { Check, AlertCircle, ChevronDown, ChevronUp, Search, Calendar, Phone, Plus, UserPlus, StickyNote, ChevronLeft, ChevronRight } from "lucide-react";
import { CAMPUS_CONFIG } from "@/config/campus";
import { supabase } from "@/lib/supabase";

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
      { key: "step3_completed", label: "학부모 서류 제출 완료 확인", role: "행정" },
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
  const [extrasExists, setExtrasExists] = useState<Record<string, boolean>>({});
  
  // Reservation Management State
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [dbSlots, setDbSlots] = useState<{id: string, date: string, time: string, max: number, current: number, is_open: boolean}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState<string | null>(null);
  const [studentReservations, setStudentReservations] = useState<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => fmtYMD(new Date()));
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
        const res = await fetch("/api/admin/new-students", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        const rows = Array.isArray(data?.items) ? data.items : [];
        const mapped: StudentProfile[] = rows.map((r: any) => ({
          id: String(r.id),
          studentName: String(r.studentName ?? r.student_name ?? r.name ?? ""),
          gender: String(r.gender ?? ""),
          parentName: String(r.parentName ?? r.parent_name ?? ""),
          phone: String(r.phone ?? ""),
          campus: String(r.campus ?? ""),
          createdAt: String(r.createdAt ?? r.created_at ?? ""),
          status: String(r.status ?? "waiting"),
          memo: String(r.memo ?? ""),
          englishFirstName: String(r.englishFirstName ?? r.english_first_name ?? ""),
          passportEnglishName: String(r.passportEnglishName ?? r.passport_english_name ?? ""),
          childBirthDate: String(r.childBirthDate ?? r.child_birth_date ?? ""),
          address: String(r.address ?? ""),
          addressDetail: String(r.addressDetail ?? r.address_detail ?? ""),
        }));
        mapped.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setStudents(mapped);
        setChecklists(data?.checklists || {});
        setStudentReservations(data?.reservations || {});
        setExtrasExists(data?.extrasExists || {});
      } catch (e) {}
    };
    load();
  }, []);
  useEffect(() => {
    // month-level schedule initialization removed
  }, [currentMonth]);

  const refetchNewStudents = async () => {
    try {
      const res = await fetch("/api/admin/new-students", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      const rows = Array.isArray(data?.items) ? data.items : [];
      const mapped: StudentProfile[] = rows.map((r: any) => ({
        id: String(r.id),
        studentName: String(r.studentName ?? r.student_name ?? r.name ?? ""),
        gender: String(r.gender ?? ""),
        parentName: String(r.parentName ?? r.parent_name ?? ""),
        phone: String(r.phone ?? ""),
        campus: String(r.campus ?? ""),
        createdAt: String(r.createdAt ?? r.created_at ?? ""),
        status: String(r.status ?? "waiting"),
        memo: String(r.memo ?? ""),
        englishFirstName: String(r.englishFirstName ?? r.english_first_name ?? ""),
        passportEnglishName: String(r.passportEnglishName ?? r.passport_english_name ?? ""),
        childBirthDate: String(r.childBirthDate ?? r.child_birth_date ?? ""),
        address: String(r.address ?? ""),
        addressDetail: String(r.addressDetail ?? r.address_detail ?? ""),
      }));
      mapped.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setStudents(mapped);
      setChecklists(data?.checklists || {});
      setStudentReservations(data?.reservations || {});
      setExtrasExists(data?.extrasExists || {});
    } catch {}
  };

  const loadDbSlots = useCallback(async (date: string) => {
    if (!date) return;
    try {
      setLoadingSlots(true);
      setErrorSlots(null);
      const { data, error } = await supabase
        .from("consultation_slots")
        .select("id,date,time,max,current,is_open")
        .eq("date", date)
        .order("time");
      if (error) {
        setDbSlots([]);
        setErrorSlots("슬롯 조회 중 오류가 발생했습니다.");
      } else {
        setDbSlots(Array.isArray(data) ? data.map((s: any) => ({
          id: String(s.id),
          date: String(s.date),
          time: String(s.time),
          max: Number(s.max ?? 0),
          current: Number(s.current ?? 0),
          is_open: !!s.is_open,
        })) : []);
      }
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    // calendar only for picking date
  }, [showCalendar, currentMonth]);

  useEffect(() => {
    if (showReservationModal) {
      loadDbSlots(selectedDate);
    }
  }, [showReservationModal, selectedDate, loadDbSlots]);

  const toggleSlotOpen = async (id: string, next: boolean) => {
    try {
      const { error } = await supabase
        .from("consultation_slots")
        .update({ is_open: next })
        .eq("id", id);
      if (!error) {
        setDbSlots(prev => prev.map(s => s.id === id ? { ...s, is_open: next } : s));
      }
    } catch {}
  };
  
  // 기존 스케줄 맵/가짜 슬롯 로직 제거됨

  const toggleCheck = async (studentId: string, stepKey: string, stepLabel: string) => {
    const currentChecked = !!(checklists[studentId]?.[stepKey]?.checked);
    const nextChecked = !currentChecked;
    const nextDate = nextChecked ? new Date().toISOString() : undefined;
    const nextBy = nextChecked ? "Admin" : undefined;
    try {
      await fetch("/api/admin/new-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId,
          key: stepKey,
          checked: nextChecked,
          date: nextDate,
          by: nextBy,
        }),
      });
      if (stepKey === "step3_completed" && nextChecked) {
        console.log("[CHECKLIST] STEP 3 completed", { studentId, stepKey, checked: nextChecked });
        const res = await fetch("/api/admin/new-students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "finalize", studentId }),
        });
        if (res.ok) {
          setStudents(prev => prev.filter(s => s.id !== studentId));
        } else {
          try {
            const errText = await res.text();
            console.error("FINALIZE FAILED", errText);
          } catch {
            console.error("FINALIZE FAILED");
          }
        }
      } else {
        await refetchNewStudents();
      }
    } catch {}

    // Trigger Logic (Automations)
    if (nextChecked) {
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
      if (stepKey === "documents_completed") {
        console.log("[CHECKLIST] STEP 3 completed", { studentId, stepKey, checked: true });
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
            <p>1) 달력 진입 시 주중 기본 11개 시간대가 자동으로 오픈됩니다.</p>
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
              <div className="ml-auto">
                <button
                  onClick={() => setShowCalendar(prev => !prev)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
                  aria-controls="calendar-section"
                  aria-expanded={showCalendar}
                >
                  <Calendar className="w-4 h-4" />
                  선택 날짜 일정 관리
                </button>
              </div>
            </div>
            {showCalendar && (
              <>
                <div className="px-4 pb-2 text-[11px] text-slate-500">캘린더 렌더링은 조회만 수행합니다. 시간대 생성은 월 초기화 버튼으로 실행됩니다.</div>
                <div className="px-4">
                  <div className="mb-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-[12px] text-yellow-800 font-bold space-y-2">
                    <div>📌 초등학생의 경우 학생과 학부모님이 모두 방문 가능한 시간으로 예약해주세요 (테스트 후 바로 상담이 이루어지게 됩니다)</div>
                    <div>📍 소요시간은 학생의 레벨에 따라 상이하며 대략 30분~1시간 소요됩니다</div>
                    <div>✏️ 테스트를 치게 되면 테스트 비용이 발생되는 점 참고 부탁드립니다 (학생의 자세한 진단을 위해 추가적인 테스트가 추가될 수도 있습니다)</div>
                  </div>
                </div>
              </>
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
                    const dateObj = new Date(dateStr);
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const isPast = dateObj.getTime() < todayStart.getTime();
                    cells.push(
                      <button
                        key={dateStr}
                        role="gridcell"
                        aria-selected={isSelected}
                        disabled={isPast}
                        onClick={() => {
                          if (isPast) return;
                          setSelectedDate(dateStr);
                          setShowReservationModal(true);
                        }}
                        className={`h-16 md:h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isPast
                            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                            : isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        } ${isToday && !isPast ? "ring-2 ring-blue-400" : ""}`}
                      >
                        <div className={`text-xs md:text-sm font-bold ${isToday && !isPast ? "text-blue-600" : "text-slate-700"}`}>
                          {day}
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
                    const dateObj = new Date(dateStr);
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const isPast = dateObj.getTime() < todayStart.getTime();
                    cells.push(
                      <button
                        key={dateStr}
                        role="gridcell"
                        aria-selected={isSelected}
                        disabled={isPast}
                        onClick={() => {
                          if (isPast) return;
                          setSelectedDate(dateStr);
                          setShowReservationModal(true);
                        }}
                        className={`h-16 md:h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isPast
                            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                            : isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        } ${isToday && !isPast ? "ring-2 ring-blue-400" : ""}`}
                      >
                        <div className={`text-xs md:text-sm font-bold ${isToday && !isPast ? "text-blue-600" : "text-slate-700"}`}>
                          {d.getDate()}
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
                    {(student.studentName || "").charAt(0) || "?"}
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
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${enrolled ? "text-white bg-green-600" : "text-white bg-slate-400"}`}>
                              {st}
                            </span>
                            
                          </div>
                        );
                      })()}
                      {reservedText && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          상담예약 : {reservedText}
                        </span>
                      )}
                      {!reservedText && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          미예약
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
                    <div className="mb-4">
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${extrasExists[student.id] ? "bg-green-500" : "bg-slate-300"}`}></div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">상담 전 설문</div>
                            <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                              작성 상태: {extrasExists[student.id] ? "완료" : "미작성"}
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/admin/new-students/${student.id}/survey`}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100"
                        >
                          자세히 보기
                        </Link>
                      </div>
                    </div>
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">DB 기준으로 실제 상담 슬롯을 표시합니다.</p>
                <button
                  onClick={() => loadDbSlots(selectedDate)}
                  className="px-3 py-2 bg-slate-100 text-slate-800 rounded-lg text-sm font-bold border border-slate-200"
                >
                  새로고침
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <h4 className="text-sm font-bold text-slate-700">등록된 슬롯 ({dbSlots.length})</h4>
                {loadingSlots ? (
                  <p className="text-center text-slate-400 text-sm py-4">로딩중...</p>
                ) : errorSlots ? (
                  <p className="text-center text-red-500 text-sm py-4">{errorSlots}</p>
                ) : dbSlots.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4">슬롯이 없습니다.</p>
                ) : (
                  dbSlots.map((slot) => (
                    <div key={slot.id} className={`flex items-center justify-between p-2 rounded-lg border ${slot.is_open ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${slot.is_open ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <div className="font-bold text-slate-800 text-xs md:text-sm">
                            {slot.time}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold">
                            남은 {Math.max(0, slot.max - slot.current)}명
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => toggleSlotOpen(slot.id, !slot.is_open)}
                          className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold border transition-all ${
                            slot.is_open 
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${slot.is_open ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                          {slot.is_open ? "접수중" : "마감됨"}
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
