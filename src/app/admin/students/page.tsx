"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { StudentFull } from "@/lib/types";

// Unified Status type including both Admission statuses (for promoted/approved) and Enrollment statuses (재원 etc.)
type Status = 
  | "waiting" | "consultation_reserved" | "consult_done" | "approved" | "promoted" | "rejected" | "hold"
  | "재원" | "휴원" | "퇴원" | "휴원 검토중" | "퇴원 검토중";
const stripEmoji = (s: string) =>
  s.replace(/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "");
const previewText = (s: string) => {
  const t = stripEmoji(s || "").trim();
  const lines = t.split(/\r?\n/).slice(0, 2).join(" ");
  return lines.length > 200 ? lines.slice(0, 200) + "…" : lines;
};

export default function AdminStudentsPage() {
  const router = useRouter();
  const [campusFilter, setCampusFilter] = useState<string>("All");
  const [classFilter, setClassFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [dajimFilter, setDajimFilter] = useState<"All" | "O" | "X">("All");
  const [showOnlyActive, setShowOnlyActive] = useState<boolean>(true);
  
  const [statusToggle, setStatusToggle] = useState<Record<string, boolean>>({
    promoted: true,
    재원: true,
    휴원: true,
    퇴원: false,
    "휴원 검토중": true,
    "퇴원 검토중": true,
    hold: false,
    rejected: false,
    waiting: false,
    consultation_reserved: false,
    consult_done: false,
    approved: false
  });

  const [query, setQuery] = useState<string>("");
  const [role, setRole] = useState<"admin" | "teacher">("admin");
  const [roleClass, setRoleClass] = useState<string | null>(null);
  const [infoStudent, setInfoStudent] = useState<StudentFull | null>(null);
  const [memoOpenFor, setMemoOpenFor] = useState<StudentFull | null>(null);
  const [newMemo, setNewMemo] = useState<string>("");
  const [memos, setMemos] = useState<Record<string, { text: string; author: string; at: string; tag?: "상담" | "결제" | "특이사항" | "기타" }[]>>({});
  const [busFilter, setBusFilter] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<string>("All");
  const [programFilter, setProgramFilter] = useState<string>("All");
  const [birthMonthFilter, setBirthMonthFilter] = useState<string>("All");
  const [updates, setUpdates] = useState<Record<string, Partial<StudentFull>>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedTargetClass, setSelectedTargetClass] = useState<string>("");
  const [newClassName, setNewClassName] = useState<string>("");
  const [studentLogs, setStudentLogs] = useState<Record<string, string[]>>({});

  const [filters, setFilters] = useState<{
    campuses: string[];
    classes: { id: string; name: string }[];
    regularClasses: { id: string; name: string }[];
    programClasses: { id: string; name: string; program_name: string }[];
    programNames: string[];
    buses: { id: string; name: string }[];
    timeSlots: string[];
  }>({
    campuses: [],
    classes: [],
    regularClasses: [],
    programClasses: [],
    programNames: [],
    buses: [],
    timeSlots: [],
  });

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch("/api/admin/student-filters");
        if (!res.ok) return;
        const data = await res.json();
        setFilters(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchFilters();
  }, []);

  const [memoPanelVisible, setMemoPanelVisible] = useState(false);
  const [statusModalFor, setStatusModalFor] = useState<StudentFull | null>(null);
  const [statusStep, setStatusStep] = useState<1 | 2>(1);
  const [nextStatus, setNextStatus] = useState<Status | null>(null);
  const [pickupTypeLocal, setPickupTypeLocal] = useState<"bus" | "self">("self");
  const [dropoffTypeLocal, setDropoffTypeLocal] = useState<"bus" | "self">("self");
  const [leaveStart, setLeaveStart] = useState<string>("");
  const [leaveEnd, setLeaveEnd] = useState<string>("");
  const [leaveReason, setLeaveReason] = useState<string>("");
  const [quitDate, setQuitDate] = useState<string>("");
  const [quitReason, setQuitReason] = useState<string>("");
  const [confirmChecked, setConfirmChecked] = useState<boolean>(false);
  const memoInputRef = useRef<HTMLInputElement | null>(null);
  const [consultModalFor, setConsultModalFor] = useState<StudentFull | null>(null);
  const [consultDate, setConsultDate] = useState<string>("");
  const [consultMethod, setConsultMethod] = useState<"" | "전화" | "대면">("");
  const [consultContent, setConsultContent] = useState<string>("");
  const [consultResult, setConsultResult] = useState<"" | "계속 재원" | "휴원 확정" | "퇴원 검토로 전환">("");
  const [leaveConfirmModalFor, setLeaveConfirmModalFor] = useState<StudentFull | null>(null);
  const [leaveConfStart, setLeaveConfStart] = useState<string>("");
  const [leaveConfEnd, setLeaveConfEnd] = useState<string>("");
  const [leaveConfReason, setLeaveConfReason] = useState<string>("");
  const [refundOption, setRefundOption] = useState<"" | "환불 없음" | "부분 환불" | "다음 달 이월">("");
  const [refundMemo, setRefundMemo] = useState<string>("");
  const [newMemoType, setNewMemoType] = useState<"상담" | "결제" | "특이사항" | "기타">("기타");

  // Vehicle Modal State
  const [vehicleModalFor, setVehicleModalFor] = useState<StudentFull | null>(null);
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [dropoffLat, setDropoffLat] = useState("");
  const [dropoffLng, setDropoffLng] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      const roleMeta = (user?.app_metadata as any)?.role;
      setRole(roleMeta === "teacher" ? "teacher" : "admin");
      setRoleClass(null);
      const { data: memRows } = await supabase
        .from("student_memos")
        .select("*")
        .order("created_at", { ascending: false });
      const memoMap: Record<string, { text: string; author: string; at: string; tag?: "상담" | "결제" | "특이사항" | "기타" }[]> = {};
      (Array.isArray(memRows) ? memRows : []).forEach((m: any) => {
        const sid = String(m.student_id);
        if (!memoMap[sid]) memoMap[sid] = [];
        memoMap[sid].push({
          text: String(m.text ?? ""),
          author: String(m.author ?? ""),
          at: String(m.created_at ?? m.at ?? ""),
          tag: (m.tag as any) ?? "기타",
        });
      });
      setMemos(memoMap);
    };
    init();
  }, []);

  const [students, setStudents] = useState<StudentFull[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/students");
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setStudents(items);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/students");
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setStudents(items);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {}, []);

  const limitedByRole = useMemo(() => {
    return students.filter(s => {
      if (role === "admin") return true;
      if (role === "teacher") return roleClass ? s.class_name === roleClass : true;
      return true;
    });
  }, [students, role, roleClass]);

  const classes = useMemo(() => {
    const set = new Set(limitedByRole.map(s => s.class_name));
    return ["All", ...Array.from(set)];
  }, [limitedByRole]);

  const merged = useMemo(() => {
    return limitedByRole.map(s => {
      const u = updates[s.id] || {};
      return { ...s, ...u };
    });
  }, [limitedByRole, updates]);

  const getConsultCount = (id: string) => {
    const list = memos[id] || [];
    return list.filter(m => m.tag === "상담").length;
  };

  const filtered = useMemo(() => {
    const list = merged.filter(s => {
      const mCampus = campusFilter === "All" || s.campus === campusFilter;
      const mClass = classFilter === "All" || s.class_name === classFilter;
      const mStatus = showOnlyActive
        ? (["promoted", "hold", "재원", "휴원", "휴원 검토중"].includes(s.status))
        : !!statusToggle[s.status as keyof typeof statusToggle];
      const mDajim = dajimFilter === "All"
        ? true
        : dajimFilter === "O"
        ? s.dajim_enabled
        : !s.dajim_enabled;
      const mMonth =
        birthMonthFilter === "All" ||
        (s.birth_date && s.birth_date.split("-")[1] === birthMonthFilter.padStart(2, "0"));
      const mQuery =
        query === "" ||
        s.student_name.includes(query) ||
        (s.english_first_name && s.english_first_name.toLowerCase().includes(query.toLowerCase()));
      const mProgram =
        programFilter === "All" ||
        (s.program_classes && s.program_classes.some(p => p.program_name === programFilter));

      return mCampus && mClass && mStatus && mDajim && mMonth && mQuery && mProgram;
    });
    return list;
  }, [merged, campusFilter, classFilter, statusFilter, birthMonthFilter, query, showOnlyActive, statusToggle, dajimFilter, programFilter]);

  const availableClasses = useMemo(() => {
    return filters.classes.map(c => c.name).sort();
  }, [filters.classes]);


  useEffect(() => {}, [students]);

  const handleProgramChange = async (studentId: string, classId: string, checked: boolean) => {
    // Logic to calculate next state
    const cls = filters.programClasses.find(c => c.id === classId);
    
    const updatePrograms = (current: { id: string; name: string; program_name?: string }[]) => {
      let next = [...current];
      if (checked) {
        if (cls && !next.some(p => p.id === classId)) {
          next.push({ id: cls.id, name: cls.name, program_name: cls.program_name });
        }
      } else {
        next = next.filter(p => p.id !== classId);
      }
      return next;
    };

    // Optimistic Update Students List
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      return { ...s, program_classes: updatePrograms(s.program_classes || []) };
    }));

    // Update infoStudent if currently viewing this student
    if (infoStudent && infoStudent.id === studentId) {
      setInfoStudent(prev => prev ? { ...prev, program_classes: updatePrograms(prev.program_classes || []) } : null);
    }

    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, classId, enabled: checked }),
      });
      if (!res.ok) throw new Error("Failed to update enrollment");
    } catch (e) {
      console.error(e);
      alert("수업 변경 저장 실패");
      // Optionally revert state here
    }
  };

  const saveUpdate = (id: string, next: Partial<StudentFull>) => {
    const apply = async () => {
      const payload: any = {};
      if (typeof next.class_name !== "undefined") payload.class_name = next.class_name;
      if (typeof next.status !== "undefined") payload.status = next.status;
      if (typeof next.bus !== "undefined") payload.bus = next.bus;
      if (typeof next.departure_time !== "undefined") payload.departure_time = next.departure_time;
      if (typeof next.english_first_name !== "undefined") payload.english_name = next.english_first_name;
      if (typeof next.dajim_enabled !== "undefined") payload.dajim_enabled = next.dajim_enabled;
      if (Object.keys(payload).length === 0) return;
      await supabase.from("students").update(payload).eq("id", id);
      setStudents(prev => prev.map(s => (s.id === id ? { ...s, ...next } : s)));
    };
    apply();
  };

  const toggleSelect = (id: string) => {
    if (role === "teacher") return;
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (role === "teacher") return;
    const ids = filtered.map(s => s.id);
    const allSelected = ids.every(id => selectedStudentIds.includes(id));
    setSelectedStudentIds(allSelected ? [] : ids);
  };

  const openBulkModal = () => {
    if (!selectedStudentIds.length) return;
    setBulkModalOpen(true);
    setSelectedTargetClass("");
  };

  const closeBulkModal = () => {
    setBulkModalOpen(false);
  };

  const handleBulkClassChange = async () => {
    if (!selectedStudentIds.length) return;
    if (!selectedTargetClass) return;
    if (!availableClasses.includes(selectedTargetClass)) return;
    const selectedStudents = merged.filter(s => selectedStudentIds.includes(s.id));
    if (!selectedStudents.length) return;
    const hasSame = selectedStudents.some(s => s.class_name === selectedTargetClass);
    if (hasSame) return;
    try {
      const newUpdates = { ...updates };
      const newLogs = { ...studentLogs };
      const { data } = await supabase.auth.getUser();
      const admin = String(data?.user?.email ?? "관리자");
      const date = new Date().toISOString().split("T")[0];
      selectedStudents.forEach(s => {
        const oldClass = s.class_name;
        newUpdates[s.id] = { ...(newUpdates[s.id] || {}), class_name: selectedTargetClass };
        const entry = `${date} 반 변경: ${oldClass} → ${selectedTargetClass} 처리자: ${admin}`;
        const list = newLogs[s.id] || [];
        list.push(entry);
        newLogs[s.id] = list;
        saveUpdate(s.id, { class_name: selectedTargetClass });
        supabase.from("student_status_logs").insert({
          student_id: s.id,
          type: "class_change",
          message: entry,
          at: new Date().toISOString(),
        });
      });
      setUpdates(newUpdates);
      setStudentLogs(newLogs);
      setSelectedStudentIds([]);
      setSelectedTargetClass("");
      closeBulkModal();
    } catch {
    }
  };

  const addNewClassToCatalog = () => {
    // Deprecated: Classes should be managed via API
  };

  const [bulkBusOpen, setBulkBusOpen] = useState(false);
  const [bulkTimeOpen, setBulkTimeOpen] = useState(false);
  const [selectedTargetBus, setSelectedTargetBus] = useState<string>("");
  const [selectedTargetTime, setSelectedTargetTime] = useState<string>("");

  const openBulkBusModal = () => {
    if (!selectedStudentIds.length) return;
    setBulkBusOpen(true);
    setSelectedTargetBus("");
  };

  const closeBulkBusModal = () => {
    setBulkBusOpen(false);
  };

  const openBulkTimeModal = () => {
    if (!selectedStudentIds.length) return;
    setBulkTimeOpen(true);
    setSelectedTargetTime("");
  };

  const closeBulkTimeModal = () => {
    setBulkTimeOpen(false);
  };

  const handleBulkBusChange = async () => {
    if (role === "teacher") return;
    if (!selectedStudentIds.length) return;
    if (!selectedTargetBus) return;
    const selectedStudents = merged.filter(s => selectedStudentIds.includes(s.id));
    if (!selectedStudents.length) return;
    const hasSame = selectedStudents.some(s => (updates[s.id]?.bus || s.bus) === selectedTargetBus);
    if (hasSame) return;
    try {
      const newUpdates = { ...updates };
      const newLogs = { ...studentLogs };
      const { data } = await supabase.auth.getUser();
      const admin = String(data?.user?.email ?? "관리자");
      const date = new Date().toISOString().split("T")[0];
      selectedStudents.forEach(s => {
        const oldBus = updates[s.id]?.bus || s.bus;
        newUpdates[s.id] = { ...(newUpdates[s.id] || {}), bus: selectedTargetBus };
        const entry = `${date} 호차 변경: ${oldBus} → ${selectedTargetBus} 처리자: ${admin}`;
        const list = newLogs[s.id] || [];
        list.push(entry);
        newLogs[s.id] = list;
        saveUpdate(s.id, { bus: selectedTargetBus });
        supabase.from("student_status_logs").insert({
          student_id: s.id,
          type: "bus_change",
          message: entry,
          at: new Date().toISOString(),
        });
      });
      setUpdates(newUpdates);
      setStudentLogs(newLogs);
      setSelectedStudentIds([]);
      setSelectedTargetBus("");
      closeBulkBusModal();
    } catch {}
  };

  const handleBulkTimeChange = async () => {
    if (role === "teacher") return;
    if (!selectedStudentIds.length) return;
    if (!selectedTargetTime) return;
    const selectedStudents = merged.filter(s => selectedStudentIds.includes(s.id));
    if (!selectedStudents.length) return;
    const hasSame = selectedStudents.some(s => (updates[s.id]?.departure_time || s.departure_time) === selectedTargetTime);
    if (hasSame) return;
    try {
      const newUpdates = { ...updates };
      const newLogs = { ...studentLogs };
      const { data } = await supabase.auth.getUser();
      const admin = String(data?.user?.email ?? "관리자");
      const date = new Date().toISOString().split("T")[0];
      selectedStudents.forEach(s => {
        const oldTime = updates[s.id]?.departure_time || s.departure_time;
        newUpdates[s.id] = { ...(newUpdates[s.id] || {}), departure_time: selectedTargetTime };
        const entry = `${date} 하원 시간대 변경: ${oldTime} → ${selectedTargetTime} 처리자: ${admin}`;
        const list = newLogs[s.id] || [];
        list.push(entry);
        newLogs[s.id] = list;
        saveUpdate(s.id, { departure_time: selectedTargetTime });
        supabase.from("student_status_logs").insert({
          student_id: s.id,
          type: "time_change",
          message: entry,
          at: new Date().toISOString(),
        });
      });
      setUpdates(newUpdates);
      setStudentLogs(newLogs);
      setSelectedStudentIds([]);
      setSelectedTargetTime("");
      closeBulkTimeModal();
    } catch {}
  };

  const openInfoPanel = (s: StudentFull) => {
    setInfoStudent(s);
    setMemoOpenFor(null);
  };

  const openMemoPanel = (s: StudentFull) => {
    setMemoOpenFor(s);
    setInfoStudent(null);
  };

  useEffect(() => {
    setMemoPanelVisible(!!memoOpenFor);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMemoOpenFor(null);
        setMemoPanelVisible(false);
      }
    };
    if (memoOpenFor) {
      window.addEventListener("keydown", onKey);
      setTimeout(() => {
        memoInputRef.current?.focus();
      }, 0);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [memoOpenFor]);

  const saveMemo = async () => {
    if (!memoOpenFor || !newMemo.trim()) return;
    const { data } = await supabase.auth.getUser();
    const author = String(data?.user?.email ?? "관리자");
    const at = new Date().toISOString();
    const next = { ...memos };
    const list = next[memoOpenFor.id] || [];
    list.unshift({ text: newMemo.trim(), author, at, tag: newMemoType });
    next[memoOpenFor.id] = list;
    setMemos(next);
    await supabase.from("student_memos").insert({
      student_id: memoOpenFor.id,
      text: newMemo.trim(),
      author,
      tag: newMemoType,
      created_at: at,
    });
    setNewMemo("");
    setNewMemoType("기타");
  };

  const handleCSVUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        const next = { ...updates };
        lines.forEach(line => {
          const [phoneRaw, engRaw] = line.split(",").map(s => s?.trim() || "");
          if (!phoneRaw || !engRaw) return;
          const target = students.find(s => s.parent_phone === phoneRaw);
          if (target) {
            next[target.id] = { ...(next[target.id] || {}), english_first_name: engRaw };
            saveUpdate(target.id, { english_first_name: engRaw } as any);
          }
        });
        setUpdates(next);
        alert("CSV 업로드로 영어이름이 일괄 업데이트되었습니다.");
      } catch {
        alert("CSV 파싱 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
  };

  const downloadStudentTemplate = () => {
    const headers = [
      "studentName",
      "englishFirstName",
      "passportEnglishName",
      "childBirthDate",
      "phone",
      "parentName",
      "address",
      "addressDetail",
      "arrivalMethod",
      "arrivalPlace",
      "departureMethod",
      "departurePlace",
      "className",
      "campus",
      "status"
    ];
    const sample = [
      "홍길동",
      "Gildong",
      "Gildong Hong",
      "2016-03-05",
      "01012345678",
      "홍부모",
      "서울시 강남구 테헤란로 1",
      "101동 1001호",
      "자가",
      "정문",
      "차량",
      "후문",
      "Kepler",
      "International",
      "promoted"
    ];
    const csv = `${headers.join(",")}\n${sample.join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStudentBulkUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          alert("CSV 내용이 비어있습니다.");
          return;
        }
        const headers = lines[0].split(",").map(h => h.trim());
        const idx = (name: string) => headers.indexOf(name);
        const required = ["studentName", "childBirthDate", "phone", "parentName", "className", "campus", "status"];
        const hasAll = required.every(h => idx(h) >= 0);
        if (!hasAll) {
          alert("필수 헤더가 누락되었습니다. 템플릿을 사용하세요.");
          return;
        }
        const rows = lines.slice(1);
        const parsed: Partial<StudentFull>[] = rows.map(line => {
          const cols = line.split(",").map(s => s?.trim() || "");
          const name = cols[idx("studentName")] || "";
          const englishFirst = cols[idx("englishFirstName")] || "";
          const passport = cols[idx("passportEnglishName")] || "";
          const englishName = englishFirst || passport;
          const birthDate = cols[idx("childBirthDate")] || "";
          const phone = cols[idx("phone")] || "";
          const parentName = cols[idx("parentName")] || "";
          const address = [cols[idx("address")] || "", cols[idx("addressDetail")] || ""].filter(Boolean).join(" ");
          const className = cols[idx("className")] || "미배정";
          const campus = cols[idx("campus")] || "미지정";
          const statusVal = (cols[idx("status")] as Status) || "재원";
          const arrivalMethod = cols[idx("arrivalMethod")] || "";
          const arrivalPlace = cols[idx("arrivalPlace")] || "";
          const departureMethod = cols[idx("departureMethod")] || "";
          const departurePlace = cols[idx("departurePlace")] || "";
          
          const dajimRaw = (cols[idx("dajim_enabled")] || "").trim().toLowerCase();
          const isDajim = ["true", "1", "o", "✔", "yes", "y"].includes(dajimRaw);

          const s: Partial<StudentFull> = {
            id: `bulk_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            student_name: name,
            english_first_name: englishName,
            birth_date: birthDate,
            parent_phone: phone,
            class_name: className,
            campus: campus,
            status: statusVal,
            parent_name: parentName,
            address: address,
            bus: departureMethod || "없음",
            departure_time: "",
            dajim_enabled: isDajim,
            // Additional fields logic if needed
          };
          return s;
        }).filter(s => s.student_name && s.parent_phone);
        
        fetch("/api/admin/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "csv", items: parsed })
        }).then(async (res) => {
          if (!res.ok) throw new Error("upload_failed");
          alert(`학생 ${parsed.length}명이 업로드되었습니다.`);
          // Optimistic update
          // setStudents(prev => [...prev, ...parsed as StudentFull[]]); // Needs strict type
          window.location.reload(); // Simple reload to fetch fresh data
        }).catch(() => {
          alert("업로드 중 오류가 발생했습니다.");
        });
      } catch {
        alert("CSV 업로드 처리 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
  };

  const openVehicleModal = (s: StudentFull) => {
    setVehicleModalFor(s);
    setPickupLat(String(s.pickup_lat ?? ""));
    setPickupLng(String(s.pickup_lng ?? ""));
    setDropoffLat(String(s.dropoff_lat ?? ""));
    setDropoffLng(String(s.dropoff_lng ?? ""));
  };

  const saveVehicleInfo = async () => {
    if (!vehicleModalFor) return;
    const a = parseFloat(pickupLat);
    const b = parseFloat(pickupLng);
    const c = parseFloat(dropoffLat);
    const d = parseFloat(dropoffLng);
    if ([a, b, c, d].some((x) => Number.isNaN(x))) {
      alert("좌표를 올바르게 입력하세요.");
      return;
    }
    await supabase
      .from("students")
      .update({
        pickup_lat: a,
        pickup_lng: b,
        dropoff_lat: c,
        dropoff_lng: d,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicleModalFor.id);
    setStudents((prev) =>
      prev.map((s) =>
        s.id === vehicleModalFor.id
          ? { ...s, pickup_lat: a, pickup_lng: b, dropoff_lat: c, dropoff_lng: d }
          : s
      )
    );
    setVehicleModalFor(null);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">원생 관리</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={downloadStudentTemplate} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold bg-white">템플릿 다운로드</button>
            <label className="text-xs font-bold text-slate-700">학생 일괄 업로드</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleStudentBulkUpload(f);
              }}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">캠퍼스</span>
          <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="All">전체</option>
            {filters.campuses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">반</span>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            {["All", ...availableClasses].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">프로그램</span>
          <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="All">전체</option>
            {filters.programNames.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">다짐</span>
          <select value={dajimFilter} onChange={(e) => setDajimFilter(e.target.value as any)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="All">전체</option>
            <option value="O">다짐 O</option>
            <option value="X">다짐 X</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => {
                const on = e.target.checked;
                setShowOnlyActive(on);
                if (on) {
                  setStatusToggle({ promoted: true, hold: false, rejected: false, waiting: false, consultation_reserved: false, consult_done: false, approved: false });
                }
              }}
              className="rounded border-slate-300"
            />
            <span className="text-sm font-bold text-slate-700">재원만 보기</span>
          </label>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="이름 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-frage-blue outline-none"
          />
        </div>
      </div>

      {!showOnlyActive && (
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-700">재원상태</span>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={statusToggle["재원"]}
                onChange={(e) => setStatusToggle((m) => ({ ...m, 재원: e.target.checked }))}
                className="rounded border-slate-300"
              />
              재원
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={statusToggle["휴원 검토중"]}
                onChange={(e) => setStatusToggle((m) => ({ ...m, "휴원 검토중": e.target.checked }))}
                className="rounded border-slate-300"
              />
              휴원 검토중
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={statusToggle["휴원"]}
                onChange={(e) => setStatusToggle((m) => ({ ...m, 휴원: e.target.checked }))}
                className="rounded border-slate-300"
              />
              휴원
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={statusToggle["퇴원 검토중"]}
                onChange={(e) => setStatusToggle((m) => ({ ...m, "퇴원 검토중": e.target.checked }))}
                className="rounded border-slate-300"
              />
              퇴원 검토중
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={statusToggle["퇴원"]}
                onChange={(e) => setStatusToggle((m) => ({ ...m, 퇴원: e.target.checked }))}
                className="rounded border-slate-300"
              />
              퇴원
            </label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">호차</span>
          <select value={busFilter} onChange={(e) => setBusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="All">전체</option>
            {filters.buses.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">하원 시간대</span>
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="All">전체</option>
            {filters.timeSlots.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">생일(월)</span>
          <select value={birthMonthFilter} onChange={(e) => setBirthMonthFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="All">전체</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={String(m)}>{m}월</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-3 font-bold w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every(s => selectedStudentIds.includes(s.id))}
                    onChange={toggleSelectAll}
                    disabled={role === "teacher"}
                    className="rounded border border-slate-200 text-frage-blue focus:ring-frage-blue"
                  />
                </th>
                <th className="p-3 font-bold">이름</th>
                <th className="p-3 font-bold w-40">영어이름</th>
                <th className="p-3 font-bold w-32">반</th>
                <th className="p-3 font-bold w-28">재원상태</th>
                <th className="p-3 font-bold w-32">생년월일</th>
                <th className="p-3 font-bold w-12 text-center">다짐</th>
                <th className="p-3 font-bold w-24 text-center">호차</th>
                <th className="p-3 font-bold w-24 text-center">하원 시간대</th>
                <th className="p-3 font-bold w-24 text-center">메모</th>
                <th className="p-3 font-bold w-16 text-center">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 50).map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      disabled={role === "teacher"}
                      className="rounded border border-slate-200 text-frage-blue focus:ring-frage-blue"
                    />
                  </td>
                  <td className="p-3">
                    <button onClick={() => openInfoPanel(s)} className="text-slate-900 font-bold hover:underline">{s.student_name}</button>
                    <div className="text-xs text-slate-400">{s.parent_phone}</div>
                  </td>
                  <td className="p-3 text-slate-700">{s.english_first_name}</td>
                  <td className="p-3 text-slate-700">{s.class_name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-[11px] font-bold border ${
                        s.status === "promoted" ? "bg-green-50 text-green-700 border-green-100" :
                        s.status === "approved" ? "bg-blue-50 text-blue-700 border-blue-100" :
                        s.status === "hold" ? "bg-amber-50 text-amber-700 border-amber-100" :
                        s.status === "rejected" ? "bg-red-50 text-red-700 border-red-100" :
                        "bg-slate-50 text-slate-700 border-slate-100"
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-slate- text-slate-700 font-bold">
                    {s.dajim_enabled ? <span className="text-green-600">✔</span> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="p-3 text-center700">{s.birth_date}</td>
                  <td className="p-3 text-center">{s.bus}</td>
                  <td className="p-3 text-center">{s.departure_time}</td>
                  <td className="p-3">
                    {Array.isArray(memos[s.id]) && memos[s.id].length > 0 ? (
                      <button
                        onClick={() => openMemoPanel(s)}
                        aria-label="메모 전체 보기"
                        className="px-2 py-1 rounded-lg border border-slate-200 text-sm bg-white hover:bg-slate-100 max-w-[220px] text-left transition-all"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        <span className="text-slate-700">[{memos[s.id][0].tag || "기타"}] {previewText(memos[s.id][0].text)}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => openMemoPanel(s)}
                        aria-label="추가"
                        className="px-2 py-1 rounded-lg border border-slate-200 text-sm font-bold bg-white hover:bg-slate-100 transition-all flex items-center gap-1 justify-center"
                      >
                        <span aria-hidden="true">📝</span>
                        <span>추가</span>
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <div className="inline-block relative">
                      <button
                        type="button"
                        aria-label="행동 메뉴 열기"
                        className="px-2 py-1 rounded border border-slate-200 text-xs bg-white hover:bg-slate-50"
                        onClick={(e) => {
                          const btn = e.currentTarget;
                          const menu = btn.nextElementSibling as HTMLDivElement | null;
                          if (menu) {
                            const open = menu.getAttribute("data-open") === "true";
                            menu.setAttribute("data-open", open ? "false" : "true");
                          }
                        }}
                      >⋯</button>
                      <div
                        data-open="false"
                        className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-10"
                        style={{ display: "none" }}
                        onBlur={(e) => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.setAttribute("data-open", "false");
                          el.style.display = "none";
                        }}
                        ref={(el) => {
                          if (!el) return;
                          const observer = new MutationObserver(() => {
                            const open = el.getAttribute("data-open") === "true";
                            el.style.display = open ? "block" : "none";
                          });
                          observer.observe(el, { attributes: true, attributeFilter: ["data-open"] });
                        }}
                      >
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={() => {
                            setStatusModalFor(s);
                            setStatusStep(1);
                            setNextStatus(null);
                            setLeaveStart("");
                            setLeaveEnd("");
                            setLeaveReason("");
                            setQuitDate("");
                            setQuitReason("");
                            setConfirmChecked(false);
                            setPickupTypeLocal((s.pickup_lat ? "bus" : "self")); // Approximate inference
                            setDropoffTypeLocal((s.dropoff_lat ? "bus" : "self"));
                          }}
                        >
                          상태 변경
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => setConsultModalFor(s)}
                          title="상담 기록"
                        >
                          상담 기록
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={() => {
                            setSelectedStudentIds([s.id]);
                            openBulkModal();
                          }}
                        >
                          반 변경
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={() => {
                            openVehicleModal(s);
                          }}
                        >
                          등하원 정보 수정
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">반 일괄 변경</h2>
            <p className="text-sm text-slate-500 mb-4">
              선택한 학생 {selectedStudentIds.length}명의 반을 변경합니다.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">변경할 반</label>
              <select
                value={selectedTargetClass}
                onChange={(e) => setSelectedTargetClass(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">선택하세요</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <label className="block text-xs font-bold text-slate-500 mb-1">새 반 추가</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="예: Einstein"
                  className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded"
                />
                <button
                  onClick={addNewClassToCatalog}
                  className="px-2 py-1 bg-slate-200 text-xs font-bold rounded hover:bg-slate-300"
                >
                  추가
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeBulkModal} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">취소</button>
              <button onClick={handleBulkClassChange} className="px-4 py-2 text-sm font-bold text-white bg-frage-blue rounded-lg hover:bg-blue-700">변경하기</button>
            </div>
          </div>
        </div>
      )}

      {bulkBusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">호차 일괄 변경</h2>
            <div className="mb-4">
              <select
                value={selectedTargetBus}
                onChange={(e) => setSelectedTargetBus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">선택하세요</option>
                <option value="1호차">1호차</option>
                <option value="2호차">2호차</option>
                <option value="3호차">3호차</option>
                <option value="4호차">4호차</option>
                <option value="5호차">5호차</option>
                <option value="6호차">6호차</option>
                <option value="7호차">7호차</option>
                <option value="없음">없음</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeBulkBusModal} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">취소</button>
              <button onClick={handleBulkBusChange} className="px-4 py-2 text-sm font-bold text-white bg-frage-blue rounded-lg hover:bg-blue-700">변경하기</button>
            </div>
          </div>
        </div>
      )}

      {bulkTimeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">하원 시간대 일괄 변경</h2>
            <div className="mb-4">
              <select
                value={selectedTargetTime}
                onChange={(e) => setSelectedTargetTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">선택하세요</option>
                <option value="09:00">09:00</option>
                <option value="13:30">13:30</option>
                <option value="16:30">16:30</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeBulkTimeModal} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">취소</button>
              <button onClick={handleBulkTimeChange} className="px-4 py-2 text-sm font-bold text-white bg-frage-blue rounded-lg hover:bg-blue-700">변경하기</button>
            </div>
          </div>
        </div>
      )}

      {memoPanelVisible && memoOpenFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-end pointer-events-none">
          <div className="w-96 h-full bg-white shadow-2xl pointer-events-auto flex flex-col transform transition-transform duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900">{memoOpenFor.student_name}</h3>
                <p className="text-xs text-slate-500">메모 및 상담 기록</p>
              </div>
              <button onClick={() => setMemoOpenFor(null)} className="p-2 text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {memos[memoOpenFor.id]?.map((m, i) => (
                <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      m.tag === "상담" ? "bg-purple-100 text-purple-700" :
                      m.tag === "결제" ? "bg-green-100 text-green-700" :
                      m.tag === "특이사항" ? "bg-red-100 text-red-700" :
                      "bg-slate-200 text-slate-600"
                    }`}>{m.tag || "기타"}</span>
                    <span className="text-[10px] text-slate-400">{m.at.split("T")[0]}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.text}</p>
                  <div className="text-[10px] text-slate-400 mt-2 text-right">by {m.author}</div>
                </div>
              ))}
              {(!memos[memoOpenFor.id] || memos[memoOpenFor.id].length === 0) && (
                <div className="text-center py-10 text-slate-400 text-sm">기록된 메모가 없습니다.</div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="flex gap-2 mb-2">
                {(["상담", "결제", "특이사항", "기타"] as const).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setNewMemoType(tag)}
                    className={`px-2 py-1 text-xs rounded border ${
                      newMemoType === tag
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                ref={memoInputRef as any}
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                placeholder="메모를 입력하세요... (Shift+Enter 줄바꿈)"
                className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-frage-blue outline-none resize-none h-24 mb-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveMemo();
                  }
                }}
              />
              <button
                onClick={saveMemo}
                disabled={!newMemo.trim()}
                className="w-full py-2 bg-frage-blue text-white font-bold rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {infoStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setInfoStudent(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg">{infoStudent.student_name} 학생 정보</h2>
              <button onClick={() => setInfoStudent(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">이름</label>
                  <div className="text-slate-900 font-medium">{infoStudent.student_name}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">영어이름</label>
                  <div className="text-slate-900 font-medium">{infoStudent.english_first_name || "-"}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">생년월일</label>
                  <div className="text-slate-900 font-medium">{infoStudent.birth_date || "-"}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">성별</label>
                  <div className="text-slate-900 font-medium">{infoStudent.gender || "-"}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">부모님 성함</label>
                  <div className="text-slate-900 font-medium">{infoStudent.parent_name || "-"}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">연락처</label>
                  <div className="text-slate-900 font-medium">{infoStudent.parent_phone || "-"}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">반</label>
                  <div className="text-slate-900 font-medium">{infoStudent.class_name || "미배정"}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">캠퍼스</label>
                  <div className="text-slate-900 font-medium">{infoStudent.campus}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">다짐 수업 여부</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={!!infoStudent.dajim_enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setInfoStudent(prev => prev ? ({ ...prev, dajim_enabled: checked }) : null);
                        saveUpdate(infoStudent.id, { dajim_enabled: checked });
                      }}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-frage-blue rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-frage-blue"></div>
                    <span className="ml-2 text-sm font-medium text-slate-900">{infoStudent.dajim_enabled ? "수업 중" : "미수업"}</span>
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500">주소</label>
                  <div className="text-slate-900 font-medium">{infoStudent.address || "-"}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">호차</label>
                  <div className="text-slate-900 font-medium">{infoStudent.bus || "-"}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">하원시간</label>
                  <div className="text-slate-900 font-medium">{infoStudent.departure_time || "-"}</div>
                </div>

                <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <label className="text-xs font-bold text-slate-500 mb-2 block">추가수업 (프로그램)</label>
                  <div className="space-y-3">
                    {filters.programNames.map(pName => {
                      const pClasses = filters.programClasses.filter(c => c.program_name === pName);
                      if (!pClasses.length) return null;
                      return (
                        <div key={pName} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="text-xs font-bold text-slate-700 mb-2">{pName}</div>
                          <div className="flex flex-wrap gap-2">
                            {pClasses.map(c => {
                              const isActive = infoStudent.program_classes?.some(pc => pc.id === c.id);
                              return (
                                <label key={c.id} className={`inline-flex items-center gap-1.5 bg-white px-2 py-1 rounded border text-xs cursor-pointer transition-colors ${isActive ? 'border-frage-blue bg-blue-50 text-frage-blue' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => handleProgramChange(infoStudent.id, c.id, e.target.checked)}
                                    className="rounded border-slate-300 text-frage-blue focus:ring-frage-blue"
                                  />
                                  <span>{c.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setInfoStudent(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100">닫기</button>
            </div>
          </div>
        </div>
      )}

      {vehicleModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">등하원 정보 수정</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">등원 위도 (Pickup Lat)</label>
                <input
                  type="text"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">등원 경도 (Pickup Lng)</label>
                <input
                  type="text"
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">하원 위도 (Dropoff Lat)</label>
                <input
                  type="text"
                  value={dropoffLat}
                  onChange={(e) => setDropoffLat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">하원 경도 (Dropoff Lng)</label>
                <input
                  type="text"
                  value={dropoffLng}
                  onChange={(e) => setDropoffLng(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setVehicleModalFor(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">취소</button>
              <button onClick={saveVehicleInfo} className="px-4 py-2 text-sm font-bold text-white bg-frage-blue rounded-lg hover:bg-blue-700">저장</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
