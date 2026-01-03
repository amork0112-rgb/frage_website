"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, Search } from "lucide-react";

type Status = "재원" | "휴원 검토중" | "휴원" | "퇴원 검토중" | "퇴원";

const stripEmoji = (s: string) =>
  s.replace(/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "");
const previewText = (s: string) => {
  const t = stripEmoji(s || "").trim();
  const lines = t.split(/\r?\n/).slice(0, 2).join(" ");
  return lines.length > 200 ? lines.slice(0, 200) + "…" : lines;
};

type Student = {
  id: string;
  childId?: string;
  name: string;
  englishName: string;
  birthDate: string;
  phone: string;
  className: string;
  campus: string;
  status: Status;
  parentName: string;
  parentAccountId: string;
  address: string;
  bus: string;
  departureTime: string;
  arrivalMethod?: string;
  arrivalPlace?: string;
  departureMethod?: string;
  departurePlace?: string;
};

type AttendanceRecord = {
  id: string;
  childId: string;
  date: string;
  status: "present" | "absent" | "early";
};

export default function AdminStudentsPage() {
  const router = useRouter();
  const KINDER = ["Kepler", "Platon", "Euclid", "Darwin", "Gauss", "Edison", "Thales"];
  const JUNIOR = ["G1", "G2", "G3", "G4", "E1", "E2", "E3", "E4", "A1", "A2", "A3", "A4", "A5", "F1", "F2", "F3", "F4", "F5"];
  const [campusFilter, setCampusFilter] = useState<string>("All");
  const [classFilter, setClassFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [showOnlyActive, setShowOnlyActive] = useState<boolean>(true);
  const [statusToggle, setStatusToggle] = useState<{ 재원: boolean; "휴원 검토중": boolean; 휴원: boolean; "퇴원 검토중": boolean; 퇴원: boolean }>({
    재원: true,
    "휴원 검토중": true,
    휴원: false,
    "퇴원 검토중": true,
    퇴원: false
  });
  const [query, setQuery] = useState<string>("");
  const [role, setRole] = useState<"admin" | "teacher">("admin");
  const [roleClass, setRoleClass] = useState<string | null>(null);
  const [infoStudent, setInfoStudent] = useState<Student | null>(null);
  const [memoOpenFor, setMemoOpenFor] = useState<Student | null>(null);
  const [newMemo, setNewMemo] = useState<string>("");
  const [memos, setMemos] = useState<Record<string, { text: string; author: string; at: string; tag?: "상담" | "결제" | "특이사항" | "기타" }[]>>({});
  const [busFilter, setBusFilter] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<string>("All");
  const [birthMonthFilter, setBirthMonthFilter] = useState<string>("All");
  const [updates, setUpdates] = useState<Record<string, { className?: string; status?: Status; englishName?: string; bus?: string; departureTime?: string }>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedTargetClass, setSelectedTargetClass] = useState<string>("");
  const [classCatalog, setClassCatalog] = useState<string[]>([]);
  const [newClassName, setNewClassName] = useState<string>("");
  const [studentLogs, setStudentLogs] = useState<Record<string, string[]>>({});
  const [memoPanelVisible, setMemoPanelVisible] = useState(false);
  const [statusModalFor, setStatusModalFor] = useState<Student | null>(null);
  const [statusStep, setStatusStep] = useState<1 | 2>(1);
  const [nextStatus, setNextStatus] = useState<Status | null>(null);
  const [leaveStart, setLeaveStart] = useState<string>("");
  const [leaveEnd, setLeaveEnd] = useState<string>("");
  const [leaveReason, setLeaveReason] = useState<string>("");
  const [quitDate, setQuitDate] = useState<string>("");
  const [quitReason, setQuitReason] = useState<string>("");
  const [confirmChecked, setConfirmChecked] = useState<boolean>(false);
  const memoInputRef = useRef<HTMLInputElement | null>(null);
  const [consultModalFor, setConsultModalFor] = useState<Student | null>(null);
  const [consultDate, setConsultDate] = useState<string>("");
  const [consultMethod, setConsultMethod] = useState<"" | "전화" | "대면">("");
  const [consultContent, setConsultContent] = useState<string>("");
  const [consultResult, setConsultResult] = useState<"" | "계속 재원" | "휴원 확정" | "퇴원 검토로 전환">("");
  const [leaveConfirmModalFor, setLeaveConfirmModalFor] = useState<Student | null>(null);
  const [leaveConfStart, setLeaveConfStart] = useState<string>("");
  const [leaveConfEnd, setLeaveConfEnd] = useState<string>("");
  const [leaveConfReason, setLeaveConfReason] = useState<string>("");
  const [refundOption, setRefundOption] = useState<"" | "환불 없음" | "부분 환불" | "다음 달 이월">("");
  const [refundMemo, setRefundMemo] = useState<string>("");
  const [newMemoType, setNewMemoType] = useState<"상담" | "결제" | "특이사항" | "기타">("기타");
  const [busModalFor, setBusModalFor] = useState<Student | null>(null);
  const [selectedBus, setSelectedBus] = useState<string>("");
  const [timeModalFor, setTimeModalFor] = useState<Student | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");

  useEffect(() => {
    try {
      const roleRaw = localStorage.getItem("admin_role");
      const classRaw = localStorage.getItem("teacher_class");
      setRole(roleRaw === "teacher" ? "teacher" : "admin");
      setRoleClass(classRaw || null);
    } catch {}
    try {
      const memoRaw = localStorage.getItem("admin_memos");
      const map = memoRaw ? JSON.parse(memoRaw) : {};
      setMemos(map || {});
    } catch {}
    try {
      const updRaw = localStorage.getItem("admin_student_updates");
      const map = updRaw ? JSON.parse(updRaw) : {};
      setUpdates(map || {});
    } catch {}
    try {
      const logsRaw = localStorage.getItem("admin_student_logs");
      const map = logsRaw ? JSON.parse(logsRaw) : {};
      setStudentLogs(map || {});
    } catch {}
    try {
      const raw = localStorage.getItem("admin_class_catalog");
      let list: string[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list) || list.length === 0) {
        list = [...KINDER, ...JUNIOR];
      }
      setClassCatalog(list);
      localStorage.setItem("admin_class_catalog", JSON.stringify(list));
    } catch {}
  }, []);

  const [students, setStudents] = useState<Student[]>([]);
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

  useEffect(() => {
    try {
      const memRaw = localStorage.getItem("admin_memos");
      const map = memRaw ? JSON.parse(memRaw) : {};
      const now = Date.now();
      let changed = false;
      Object.keys(map).forEach((id) => {
        const list = Array.isArray(map[id]) ? map[id] : [];
        const filtered = list.filter((m: any) => {
          const t = String(m.text || "");
          if (t.includes("신규")) {
            const atMs = Date.parse(String(m.at || ""));
            if (!Number.isNaN(atMs)) {
              const diffDays = Math.floor((now - atMs) / (1000 * 60 * 60 * 24));
              return diffDays <= 30;
            }
            return false;
          }
          return true;
        });
        if (filtered.length !== list.length) {
          map[id] = filtered;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem("admin_memos", JSON.stringify(map));
        setMemos(map);
      }
    } catch {}
  }, []);

  const limitedByRole = useMemo(() => {
    return students.filter(s => {
      if (role === "admin") return true;
      if (role === "teacher") return roleClass ? s.className === roleClass : true;
      return true;
    });
  }, [students, role, roleClass]);

  const classes = useMemo(() => {
    const set = new Set(limitedByRole.map(s => s.className));
    return ["All", ...Array.from(set)];
  }, [limitedByRole]);

  const merged = useMemo(() => {
    return limitedByRole.map(s => {
      const u = updates[s.id] || {};
      return { ...s, ...u };
    });
  }, [limitedByRole, updates]);
  
  const getConsultCount = (id: string) => {
    try {
      const raw = localStorage.getItem("admin_consult_logs");
      const map: Record<string, any[]> = raw ? JSON.parse(raw) : {};
      const arr = map[id] || [];
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  };

  const filtered = useMemo(() => {
    const list = merged.filter(s => {
      const mCampus = campusFilter === "All" || s.campus === campusFilter;
      const mClass = classFilter === "All" || s.className === classFilter;
      const mStatus = showOnlyActive
        ? (s.status === "재원" || s.status === "휴원 검토중" || s.status === "퇴원 검토중")
        : !!statusToggle[s.status as keyof typeof statusToggle];
      const mBus = busFilter === "All" || s.bus === busFilter;
      const mTime = timeFilter === "All" || s.departureTime === timeFilter;
      const mMonth =
        birthMonthFilter === "All" ||
        (s.birthDate.split("-")[1] === birthMonthFilter.padStart(2, "0"));
      const mQuery =
        query === "" ||
        s.name.includes(query) ||
        s.englishName.toLowerCase().includes(query.toLowerCase());
      return mCampus && mClass && mStatus && mBus && mTime && mMonth && mQuery;
    });
    return list;
  }, [merged, campusFilter, classFilter, statusFilter, busFilter, timeFilter, birthMonthFilter, query]);

  const campusForFilter = useMemo(() => {
    if (campusFilter !== "All") return campusFilter;
    return null;
  }, [campusFilter]);

  const campusClasses = useMemo(() => {
    const source = limitedByRole.filter(s => !campusForFilter || s.campus === campusForFilter);
    const set = new Set(source.map(s => s.className));
    return Array.from(set);
  }, [limitedByRole, campusForFilter]);

  const availableClasses = useMemo(() => {
    const set = new Set<string>([...classCatalog, ...campusClasses]);
    return Array.from(set);
  }, [classCatalog, campusClasses]);

  useEffect(() => {
    try {
      const rawProfiles = localStorage.getItem("signup_profiles");
      const profiles: { phone: string; englishFirstName?: string; englishName?: string }[] = rawProfiles ? JSON.parse(rawProfiles) : [];
      const hasProfiles = Array.isArray(profiles) && profiles.length > 0;
      const raw = localStorage.getItem("signup_english_names");
      const legacy: { phone: string; englishName: string }[] = raw ? JSON.parse(raw) : [];
      const hasLegacy = Array.isArray(legacy) && legacy.length > 0;
      if (!hasProfiles && !hasLegacy) return;
      const next = { ...updates };
      students.forEach(s => {
        const matchNew = hasProfiles ? profiles.find(item => item.phone === s.phone) : undefined;
        const matchLegacy = !matchNew && hasLegacy ? legacy.find(item => item.phone === s.phone) : undefined;
        const value = matchNew?.englishFirstName || matchNew?.englishName || matchLegacy?.englishName;
        if (value && value !== s.englishName) {
          next[s.id] = { ...(next[s.id] || {}), englishName: value };
        }
      });
      setUpdates(next);
      localStorage.setItem("admin_student_updates", JSON.stringify(next));
    } catch {}
  }, [students]);

  const saveUpdate = (id: string, next: Partial<{ className: string; status: Status }>) => {
    const prev = updates[id] || {};
    const merged = { ...prev, ...next };
    const map = { ...updates, [id]: merged };
    setUpdates(map);
    localStorage.setItem("admin_student_updates", JSON.stringify(map));
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

  const handleBulkClassChange = () => {
    if (!selectedStudentIds.length) return;
    if (!selectedTargetClass) return;
    if (!availableClasses.includes(selectedTargetClass)) return;
    const selectedStudents = merged.filter(s => selectedStudentIds.includes(s.id));
    if (!selectedStudents.length) return;
    const hasSame = selectedStudents.some(s => s.className === selectedTargetClass);
    if (hasSame) return;
    try {
      const newUpdates = { ...updates };
      const newLogs = { ...studentLogs };
      const admin = localStorage.getItem("admin_name") || "관리자";
      const date = new Date().toISOString().split("T")[0];
      selectedStudents.forEach(s => {
        const oldClass = s.className;
        newUpdates[s.id] = { ...(newUpdates[s.id] || {}), className: selectedTargetClass };
        const entry = `${date} 반 변경: ${oldClass} → ${selectedTargetClass} 처리자: ${admin}`;
        const list = newLogs[s.id] || [];
        list.push(entry);
        newLogs[s.id] = list;
      });
      setUpdates(newUpdates);
      setStudentLogs(newLogs);
      localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
      localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
      setSelectedStudentIds([]);
      setSelectedTargetClass("");
      closeBulkModal();
    } catch {
    }
  };

  const addNewClassToCatalog = () => {
    const name = (newClassName || "").trim();
    if (!name) return;
    const next = Array.from(new Set([...(classCatalog || []), name]));
    setClassCatalog(next);
    localStorage.setItem("admin_class_catalog", JSON.stringify(next));
    setNewClassName("");
    setSelectedTargetClass(name);
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

  const handleBulkBusChange = () => {
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
      const admin = localStorage.getItem("admin_name") || "관리자";
      const date = new Date().toISOString().split("T")[0];
      selectedStudents.forEach(s => {
        const oldBus = updates[s.id]?.bus || s.bus;
        newUpdates[s.id] = { ...(newUpdates[s.id] || {}), bus: selectedTargetBus };
        const entry = `${date} 호차 변경: ${oldBus} → ${selectedTargetBus} 처리자: ${admin}`;
        const list = newLogs[s.id] || [];
        list.push(entry);
        newLogs[s.id] = list;
      });
      setUpdates(newUpdates);
      setStudentLogs(newLogs);
      localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
      localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
      setSelectedStudentIds([]);
      setSelectedTargetBus("");
      closeBulkBusModal();
    } catch {}
  };

  const handleBulkTimeChange = () => {
    if (role === "teacher") return;
    if (!selectedStudentIds.length) return;
    if (!selectedTargetTime) return;
    const selectedStudents = merged.filter(s => selectedStudentIds.includes(s.id));
    if (!selectedStudents.length) return;
    const hasSame = selectedStudents.some(s => (updates[s.id]?.departureTime || s.departureTime) === selectedTargetTime);
    if (hasSame) return;
    try {
      const newUpdates = { ...updates };
      const newLogs = { ...studentLogs };
      const admin = localStorage.getItem("admin_name") || "관리자";
      const date = new Date().toISOString().split("T")[0];
      selectedStudents.forEach(s => {
        const oldTime = updates[s.id]?.departureTime || s.departureTime;
        newUpdates[s.id] = { ...(newUpdates[s.id] || {}), departureTime: selectedTargetTime };
        const entry = `${date} 하원 시간대 변경: ${oldTime} → ${selectedTargetTime} 처리자: ${admin}`;
        const list = newLogs[s.id] || [];
        list.push(entry);
        newLogs[s.id] = list;
      });
      setUpdates(newUpdates);
      setStudentLogs(newLogs);
      localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
      localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
      setSelectedStudentIds([]);
      setSelectedTargetTime("");
      closeBulkTimeModal();
    } catch {}
  };

  const openInfoPanel = (s: Student) => {
    setInfoStudent(s);
    setMemoOpenFor(null);
  };

  const openMemoPanel = (s: Student) => {
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

  const saveMemo = () => {
    if (!memoOpenFor || !newMemo.trim()) return;
    const author = localStorage.getItem("admin_name") || "관리자";
    const at = new Date().toISOString();
    const next = { ...memos };
    const list = next[memoOpenFor.id] || [];
    list.unshift({ text: newMemo.trim(), author, at, tag: newMemoType });
    next[memoOpenFor.id] = list;
    setMemos(next);
    localStorage.setItem("admin_memos", JSON.stringify(next));
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
          const target = students.find(s => s.phone === phoneRaw);
          if (target) {
            next[target.id] = { ...(next[target.id] || {}), englishName: engRaw };
          }
        });
        setUpdates(next);
        localStorage.setItem("admin_student_updates", JSON.stringify(next));
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
      "재원"
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
        const parsed: Student[] = rows.map(line => {
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
          const s: Student = {
            id: `bulk_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            childId: undefined,
            name,
            englishName,
            birthDate,
            phone,
            className,
            campus,
            status: statusVal,
            parentName,
            parentAccountId: "",
            address,
            bus: departureMethod || "없음",
            departureTime: "",
            arrivalMethod,
            arrivalPlace,
            departureMethod,
            departurePlace
          } as any;
          return s;
        }).filter(s => s.name && s.phone);
        fetch("/api/admin/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: parsed })
        }).then(async (res) => {
          if (!res.ok) throw new Error("upload_failed");
          alert(`학생 ${parsed.length}명이 업로드되었습니다.`);
          setStudents(prev => {
            const existingPhones = new Set(prev.map(s => s.phone));
            const added = parsed.filter(s => !existingPhones.has(s.phone));
            return [...prev, ...added];
          });
        }).catch(() => {
          alert("업로드 중 오류가 발생했습니다.");
        });
      } catch {
        alert("CSV 업로드 처리 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
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
            <option value="International">국제관</option>
            <option value="Andover">앤도버</option>
            <option value="Atheneum">아테네움</option>
            <option value="Platz">플라츠</option>
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
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => {
                const on = e.target.checked;
                setShowOnlyActive(on);
                if (on) {
                  setStatusToggle({ 재원: true, "휴원 검토중": true, "퇴원 검토중": true, 휴원: false, 퇴원: false });
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">하원 시간대</span>
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="All">전체</option>
            <option value="09:00">09:00</option>
            <option value="13:30">13:30</option>
            <option value="16:30">16:30</option>
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
                    <button onClick={() => openInfoPanel(s)} className="text-slate-900 font-bold hover:underline">{s.name}</button>
                    <div className="text-xs text-slate-400">{s.phone}</div>
                  </td>
                  <td className="p-3 text-slate-700">{s.englishName}</td>
                  <td className="p-3 text-slate-700">{s.className}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-[11px] font-bold border ${
                        s.status === "재원" ? "bg-green-50 text-green-700 border-green-100" :
                        s.status === "휴원 검토중" ? "bg-blue-50 text-blue-700 border-blue-100" :
                        s.status === "휴원" ? "bg-amber-50 text-amber-700 border-amber-100" :
                        s.status === "퇴원 검토중" ? "bg-orange-50 text-orange-700 border-orange-100" :
                        "bg-red-50 text-red-700 border-red-100"
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-700">{s.birthDate}</td>
                  <td className="p-3 text-center">{s.bus}</td>
                  <td className="p-3 text-center">{s.departureTime}</td>
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
                          }}
                        >
                          상태 변경
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => setConsultModalFor(s)}
                          disabled={s.status !== "휴원 검토중"}
                          title={s.status !== "휴원 검토중" ? "휴원 검토중 상태에서만 상담 기록 가능" : ""}
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
                          onClick={() => setBusModalFor(s)}
                        >
                          호차 변경
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={() => setTimeModalFor(s)}
                        >
                          하원 시간대 변경
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-slate-500">조건에 맞는 학생이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudentIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-40 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-900">선택된 원생 {selectedStudentIds.length}명</span>
          <button
            onClick={openBulkModal}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
          >
            반 변경
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={openBulkBusModal}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
            >
              호차 변경
            </button>
            <button
              onClick={openBulkTimeModal}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
            >
              하원 시간대 변경
            </button>
          </div>
        </div>
      )}

      {statusModalFor && (
        <div className="fixed inset-0 z-30 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStatusModalFor(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[560px] max-w-[94vw] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">재원 상태 변경</h3>
              <button onClick={() => setStatusModalFor(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">학생 이름</span>
                  <span className="text-sm font-bold text-slate-800">{statusModalFor.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">캠퍼스 / 반</span>
                  <span className="text-sm font-bold text-slate-800">{statusModalFor.campus} / {statusModalFor.className}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">현재 상태</span>
                  <span className={`px-2 py-1 rounded text-[11px] font-bold border ${
                    statusModalFor.status === "재원" ? "bg-green-50 text-green-700 border-green-100" :
                    statusModalFor.status === "휴원 검토중" ? "bg-blue-50 text-blue-700 border-blue-100" :
                    statusModalFor.status === "휴원" ? "bg-amber-50 text-amber-700 border-amber-100" :
                    statusModalFor.status === "퇴원 검토중" ? "bg-orange-50 text-orange-700 border-orange-100" :
                    "bg-red-50 text-red-700 border-red-100"
                  }`}>
                    {statusModalFor.status}
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                {statusStep === 1 && (
                    <div className="space-y-3">
                      <div className="text-sm font-bold text-slate-900">변경할 상태 선택</div>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="nextStatus"
                            checked={nextStatus === "휴원"}
                            onChange={() => {
                              if (statusModalFor?.status === "재원") return;
                              if (statusModalFor?.status === "휴원 검토중" && getConsultCount(statusModalFor.id) === 0) return;
                              setNextStatus("휴원");
                            }}
                            className="rounded border-slate-300"
                          />
                          <span title={statusModalFor?.status === "휴원 검토중" && getConsultCount(statusModalFor!.id) === 0 ? "휴원 확정 전 최소 1회 상담 기록 필요" : ""}>휴원</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="nextStatus"
                            checked={nextStatus === "퇴원"}
                          onChange={() => {
                            if (statusModalFor?.status === "재원") return;
                            setNextStatus("퇴원");
                          }}
                            className="rounded border-slate-300"
                          />
                          퇴원
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="nextStatus"
                            checked={nextStatus === "휴원 검토중"}
                            onChange={() => setNextStatus("휴원 검토중")}
                            className="rounded border-slate-300"
                          />
                          휴원 검토중
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="nextStatus"
                            checked={nextStatus === "퇴원 검토중"}
                            onChange={() => setNextStatus("퇴원 검토중")}
                            className="rounded border-slate-300"
                          />
                          퇴원 검토중
                        </label>
                        {statusModalFor?.status === "퇴원 검토중" && (
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="nextStatus"
                              checked={nextStatus === "재원"}
                              onChange={() => setNextStatus("재원")}
                              className="rounded border-slate-300"
                            />
                            재원
                          </label>
                        )}
                        {statusModalFor?.status === "휴원 검토중" && (
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="nextStatus"
                              checked={nextStatus === "재원"}
                              onChange={() => setNextStatus("재원")}
                              className="rounded border-slate-300"
                            />
                            재원
                          </label>
                        )}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => nextStatus ? setStatusStep(2) : null}
                          disabled={!nextStatus}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white disabled:opacity-50"
                          title={!nextStatus ? "변경할 상태를 선택하세요" : ""}
                        >
                          다음
                        </button>
                      </div>
                    </div>
                )}
                {statusStep === 2 && nextStatus === "휴원" && (
                  <div className="space-y-3">
                    <div className="text-sm font-bold text-slate-900">휴원 정보 입력</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-700">휴원 시작일</span>
                        <input
                          type="date"
                          value={leaveStart}
                          onChange={(e) => setLeaveStart(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-700">휴원 종료일</span>
                        <input
                          type="date"
                          value={leaveEnd}
                          min={leaveStart || undefined}
                          onChange={(e) => setLeaveEnd(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-700">휴원 사유</span>
                        <textarea
                          value={leaveReason}
                          onChange={(e) => setLeaveReason(e.target.value)}
                          minLength={5}
                          rows={3}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                          placeholder="5자 이상"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between">
                      <button onClick={() => setStatusStep(1)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">이전</button>
                      <button
                        disabled={
                          !leaveStart ||
                          !leaveEnd ||
                          new Date(leaveEnd) <= new Date(leaveStart) ||
                          (leaveReason || "").trim().length < 5
                        }
                        onClick={() => {
                          if (!leaveStart || !leaveEnd) return;
                          if (new Date(leaveEnd) <= new Date(leaveStart)) return;
                          if ((leaveReason || "").trim().length < 5) return;
                          const id = statusModalFor!.id;
                          const admin = localStorage.getItem("admin_name") || "관리자";
                          const date = new Date().toISOString().split("T")[0];
                          const newUpdates = { ...updates, [id]: { ...(updates[id] || {}), status: "휴원" as Status } };
                          const entry = `${date} 상태 변경: 재원 → 휴원 (기간: ${leaveStart}~${leaveEnd}, 사유: ${leaveReason.trim()}) 처리자: ${admin}`;
                          const newLogs = { ...studentLogs };
                          const list = newLogs[id] || [];
                          list.push(entry);
                          newLogs[id] = list;
                          setUpdates(newUpdates);
                          setStudentLogs(newLogs);
                          localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
                          localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
                          setStatusModalFor(null);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                        title={
                          !leaveStart
                            ? "휴원 시작일을 입력하세요"
                            : !leaveEnd
                            ? "휴원 종료일을 입력하세요"
                            : new Date(leaveEnd) <= new Date(leaveStart)
                            ? "종료일은 시작일 이후여야 합니다"
                            : (leaveReason || "").trim().length < 5
                            ? "사유는 5자 이상 입력하세요"
                            : ""
                        }
                      >
                        변경 저장
                      </button>
                    </div>
                  </div>
                )}
                {statusStep === 2 && nextStatus === "휴원 검토중" && (
                  <div className="space-y-3">
                    <div className="text-sm font-bold text-slate-900">휴원 검토 상태로 전환</div>
                    <div className="text-xs text-slate-600">내부 관리 상태입니다. 학부모 포털에는 노출되지 않습니다.</div>
                    <div className="mt-4 flex justify-between">
                      <button onClick={() => setStatusStep(1)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">이전</button>
                      <button
                        onClick={() => {
                          const id = statusModalFor!.id;
                          const admin = localStorage.getItem("admin_name") || "관리자";
                          const date = new Date().toISOString().split("T")[0];
                          const newUpdates = { ...updates, [id]: { ...(updates[id] || {}), status: "휴원 검토중" as Status } };
                          const entry = `${date} 재원상태 변경: ${statusModalFor!.status} → 휴원 검토중 처리자: ${admin}`;
                          const newLogs = { ...studentLogs };
                          const list = newLogs[id] || [];
                          list.push(entry);
                          newLogs[id] = list;
                          setUpdates(newUpdates);
                          setStudentLogs(newLogs);
                          localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
                          localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
                          try {
                            const raw = localStorage.getItem("admin_manual_alerts");
                            const arr = raw ? JSON.parse(raw) : [];
                            const item = {
                              id: `manual-${id}-${Date.now()}`,
                              name: statusModalFor!.name,
                              campus: statusModalFor!.campus,
                              className: statusModalFor!.className,
                              status: "휴원 검토중",
                              signals: [],
                              level: "주의",
                              firstDetectedAt: date
                            };
                            const nextArr = Array.isArray(arr) ? [item, ...arr] : [item];
                            localStorage.setItem("admin_manual_alerts", JSON.stringify(nextArr));
                          } catch {}
                          try {
                            const inboxRaw = localStorage.getItem("admin_consult_inbox");
                            const inboxMap = inboxRaw ? JSON.parse(inboxRaw) : {};
                            const leaveList = Array.isArray(inboxMap.leave) ? inboxMap.leave : [];
                            const consultRaw = localStorage.getItem("admin_consult_logs");
                            const consultMap: Record<string, any[]> = consultRaw ? JSON.parse(consultRaw) : {};
                            const consultArr = Array.isArray(consultMap[id]) ? consultMap[id] : [];
                            const last = consultArr.length ? consultArr[consultArr.length - 1] : null;
                            const inboxItem = {
                              id,
                              name: statusModalFor!.name,
                              campus: statusModalFor!.campus,
                              className: statusModalFor!.className,
                              consultDate: last?.consultDate || date,
                              consultMethod: last?.consultMethod || "전화",
                              consultContent: last?.consultContent || "휴원 검토 시작",
                              consultResult: last?.consultResult || "휴원 검토중"
                            };
                            inboxMap.leave = [inboxItem, ...leaveList];
                            localStorage.setItem("admin_consult_inbox", JSON.stringify(inboxMap));
                            const moveLogsRaw = localStorage.getItem("admin_consult_move_logs");
                            const moveLogs: string[] = moveLogsRaw ? JSON.parse(moveLogsRaw) : [];
                            moveLogs.push(`${date} 상담기록 이동: ${statusModalFor!.name} → 휴원 검토 Inbox 처리자: ${admin}`);
                            localStorage.setItem("admin_consult_move_logs", JSON.stringify(moveLogs));
                            alert("상태 변경 완료 • 이탈 시그널 페이지로 이동합니다.");
                            router.push("/admin/alerts");
                          } catch {}
                          setStatusModalFor(null);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                        title=""
                      >
                        변경사항 저장
                      </button>
                    </div>
                  </div>
                )}
                {statusStep === 2 && nextStatus === "퇴원 검토중" && (
                  <div className="space-y-3">
                    <div className="text-sm font-bold text-slate-900">퇴원 검토 상태로 전환</div>
                    <div className="text-xs text-slate-600">내부 관리 상태입니다. 학부모 포털에는 노출되지 않습니다.</div>
                    <div className="mt-4 flex justify-between">
                      <button onClick={() => setStatusStep(1)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">이전</button>
                      <button
                        onClick={() => {
                          const id = statusModalFor!.id;
                          const admin = localStorage.getItem("admin_name") || "관리자";
                          const date = new Date().toISOString().split("T")[0];
                          const newUpdates = { ...updates, [id]: { ...(updates[id] || {}), status: "퇴원 검토중" as Status } };
                          const entry = `${date} 재원상태 변경: ${statusModalFor!.status} → 퇴원 검토중 처리자: ${admin}`;
                          const newLogs = { ...studentLogs };
                          const list = newLogs[id] || [];
                          list.push(entry);
                          newLogs[id] = list;
                          setUpdates(newUpdates);
                          setStudentLogs(newLogs);
                          localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
                          localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
                          try {
                            const raw = localStorage.getItem("admin_manual_alerts");
                            const arr = raw ? JSON.parse(raw) : [];
                            const item = {
                              id: `manual-${id}-${Date.now()}`,
                              name: statusModalFor!.name,
                              campus: statusModalFor!.campus,
                              className: statusModalFor!.className,
                              status: "퇴원 검토중",
                              signals: [],
                              level: "경고",
                              firstDetectedAt: date
                            };
                            const nextArr = Array.isArray(arr) ? [item, ...arr] : [item];
                            localStorage.setItem("admin_manual_alerts", JSON.stringify(nextArr));
                          } catch {}
                          try {
                            const inboxRaw = localStorage.getItem("admin_consult_inbox");
                            const inboxMap = inboxRaw ? JSON.parse(inboxRaw) : {};
                            const quitList = Array.isArray(inboxMap.quit) ? inboxMap.quit : [];
                            const consultRaw = localStorage.getItem("admin_consult_logs");
                            const consultMap: Record<string, any[]> = consultRaw ? JSON.parse(consultRaw) : {};
                            const consultArr = Array.isArray(consultMap[id]) ? consultMap[id] : [];
                            const last = consultArr.length ? consultArr[consultArr.length - 1] : null;
                            const inboxItem = {
                              id,
                              name: statusModalFor!.name,
                              campus: statusModalFor!.campus,
                              className: statusModalFor!.className,
                              consultDate: last?.consultDate || date,
                              consultMethod: last?.consultMethod || "전화",
                              consultContent: last?.consultContent || "퇴원 검토 시작",
                              consultResult: last?.consultResult || "퇴원 검토중"
                            };
                            inboxMap.quit = [inboxItem, ...quitList];
                            localStorage.setItem("admin_consult_inbox", JSON.stringify(inboxMap));
                            const moveLogsRaw = localStorage.getItem("admin_consult_move_logs");
                            const moveLogs: string[] = moveLogsRaw ? JSON.parse(moveLogsRaw) : [];
                            moveLogs.push(`${date} 상담기록 이동: ${statusModalFor!.name} → 퇴원 검토 Inbox 처리자: ${admin}`);
                            localStorage.setItem("admin_consult_move_logs", JSON.stringify(moveLogs));
                            alert("상태 변경 완료 • 이탈 시그널 페이지로 이동합니다.");
                            router.push("/admin/alerts");
                          } catch {}
                          setStatusModalFor(null);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                        title=""
                      >
                        변경사항 저장
                      </button>
                    </div>
                  </div>
                )}
                {statusStep === 2 && nextStatus === "재원" && (
                  <div className="space-y-3">
                    <div className="text-sm font-bold text-slate-900">재원으로 복귀</div>
                    <div className="mt-4 flex justify-between">
                      <button onClick={() => setStatusStep(1)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">이전</button>
                      <button
                        onClick={() => {
                          const id = statusModalFor!.id;
                          const admin = localStorage.getItem("admin_name") || "관리자";
                          const date = new Date().toISOString().split("T")[0];
                          const newUpdates = { ...updates, [id]: { ...(updates[id] || {}), status: "재원" as Status } };
                          const entry = `${date} 재원상태 변경: 퇴원 검토중 → 재원 처리자: ${admin}`;
                          const newLogs = { ...studentLogs };
                          const list = newLogs[id] || [];
                          list.push(entry);
                          newLogs[id] = list;
                          setUpdates(newUpdates);
                          setStudentLogs(newLogs);
                          localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
                          localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
                          setStatusModalFor(null);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                        title=""
                      >
                        변경사항 저장
                      </button>
                    </div>
                  </div>
                )}
                {statusStep === 2 && nextStatus === "퇴원" && (
                  <div className="space-y-3">
                    <div className="text-sm font-bold text-slate-900">퇴원 정보 입력</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-700">퇴원일</span>
                        <input
                          type="date"
                          value={quitDate}
                          onChange={(e) => setQuitDate(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-700">퇴원 사유</span>
                        <textarea
                          value={quitReason}
                          onChange={(e) => setQuitReason(e.target.value)}
                          minLength={5}
                          rows={3}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                          placeholder="5자 이상"
                        />
                      </div>
                      <label className="col-span-2 inline-flex items-center gap-2 text-xs text-slate-700">
                        <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} className="rounded border-slate-300" />
                        안내 사항을 확인했습니다.
                      </label>
                    </div>
                    <div className="mt-4 flex justify-between">
                      <button onClick={() => setStatusStep(1)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">이전</button>
                      <button
                        disabled={
                          !quitDate ||
                          (quitReason || "").trim().length < 5 ||
                          !confirmChecked
                        }
                        onClick={() => {
                          if (!quitDate) return;
                          if ((quitReason || "").trim().length < 5) return;
                          if (!confirmChecked) return;
                          const id = statusModalFor!.id;
                          const admin = localStorage.getItem("admin_name") || "관리자";
                          const date = new Date().toISOString().split("T")[0];
                          const newUpdates = { ...updates, [id]: { ...(updates[id] || {}), status: "퇴원" as Status } };
                          const entry = `${date} 상태 변경: 재원/휴원 → 퇴원 (퇴원일: ${quitDate}, 사유: ${quitReason.trim()}) 처리자: ${admin}`;
                          const newLogs = { ...studentLogs };
                          const list = newLogs[id] || [];
                          list.push(entry);
                          newLogs[id] = list;
                          setUpdates(newUpdates);
                          setStudentLogs(newLogs);
                          localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
                          localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
                          setStatusModalFor(null);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                        title={
                          !quitDate
                            ? "퇴원일을 입력하세요"
                            : (quitReason || "").trim().length < 5
                            ? "사유는 5자 이상 입력하세요"
                            : !confirmChecked
                            ? "안내 사항을 확인하세요"
                            : ""
                        }
                      >
                        변경 저장
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {consultModalFor && (
        <div className="fixed inset-0 z-30 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConsultModalFor(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[560px] max-w-[94vw] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">휴원 검토 상담 기록</h3>
              <button onClick={() => setConsultModalFor(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">학생 이름</span>
                  <span className="text-sm font-bold text-slate-800">{consultModalFor.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">반</span>
                  <span className="text-sm font-bold text-slate-800">{consultModalFor.className}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">현재 상태</span>
                  <span className="px-2 py-1 rounded text-[11px] font-bold border bg-blue-50 text-blue-700 border-blue-100">휴원 검토중</span>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-700">상담 일자</span>
                    <input type="date" value={consultDate} onChange={(e) => setConsultDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-700">상담 방식</span>
                    <select value={consultMethod} onChange={(e) => setConsultMethod(e.target.value as any)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                      <option value="">선택</option>
                      <option value="전화">전화</option>
                      <option value="대면">대면</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-700">상담 내용</span>
                    <textarea value={consultContent} onChange={(e) => setConsultContent(e.target.value)} rows={4} placeholder="최소 10자" className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2">상담 결과</div>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="radio" name="consultResult" checked={consultResult === "계속 재원"} onChange={() => setConsultResult("계속 재원")} className="rounded border-slate-300" />
                      계속 재원
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="radio" name="consultResult" checked={consultResult === "휴원 확정"} onChange={() => setConsultResult("휴원 확정")} className="rounded border-slate-300" />
                      휴원 확정
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="radio" name="consultResult" checked={consultResult === "퇴원 검토로 전환"} onChange={() => setConsultResult("퇴원 검토로 전환")} className="rounded border-slate-300" />
                      퇴원 검토로 전환
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      const ok =
                        !!consultDate &&
                        !!consultMethod &&
                        (consultContent || "").trim().length >= 10 &&
                        !!consultResult;
                      if (!ok) return;
                      const id = consultModalFor!.id;
                      const admin = localStorage.getItem("admin_name") || "관리자";
                      const date = new Date().toISOString().split("T")[0];
                      try {
                        const raw = localStorage.getItem("admin_consult_logs");
                        const map: Record<string, any[]> = raw ? JSON.parse(raw) : {};
                        const arr = Array.isArray(map[id]) ? map[id] : [];
                        arr.push({ consultDate, consultMethod, consultContent: consultContent.trim(), consultResult, actor: admin, at: date });
                        map[id] = arr;
                        localStorage.setItem("admin_consult_logs", JSON.stringify(map));
                      } catch {}
                      const logs = { ...studentLogs };
                      const list = logs[id] || [];
                      list.push(`${date} 휴원 검토 상담 완료 결과: ${consultResult} 처리자: ${admin}`);
                      logs[id] = list;
                      setStudentLogs(logs);
                      localStorage.setItem("admin_student_logs", JSON.stringify(logs));
                      if (consultResult === "계속 재원") {
                        const newUpdates = { ...updates, [id]: { ...(updates[id] || {}), status: "재원" as Status } };
                        setUpdates(newUpdates);
                        localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
                        setConsultModalFor(null);
                      } else if (consultResult === "휴원 확정") {
                        setConsultModalFor(null);
                        setLeaveConfirmModalFor(merged.find(m => m.id === id) || null);
                      } else {
                        const newUpdates = { ...updates, [id]: { ...(updates[id] || {}), status: "퇴원 검토중" as Status } };
                        setUpdates(newUpdates);
                        localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
                        try {
                          const raw = localStorage.getItem("admin_manual_alerts");
                          const arr = raw ? JSON.parse(raw) : [];
                          const item = {
                            id: `manual-${id}-${Date.now()}`,
                            name: consultModalFor!.name,
                            campus: consultModalFor!.campus,
                            className: consultModalFor!.className,
                            status: "퇴원 검토중",
                            signals: [],
                            level: "경고",
                            firstDetectedAt: date
                          };
                          const nextArr = Array.isArray(arr) ? [item, ...arr] : [item];
                          localStorage.setItem("admin_manual_alerts", JSON.stringify(nextArr));
                        } catch {}
                        try {
                          const inboxRaw = localStorage.getItem("admin_consult_inbox");
                          const inboxMap = inboxRaw ? JSON.parse(inboxRaw) : {};
                          const quitList = Array.isArray(inboxMap.quit) ? inboxMap.quit : [];
                          const inboxItem = {
                            id,
                            name: consultModalFor!.name,
                            campus: consultModalFor!.campus,
                            className: consultModalFor!.className,
                            consultDate,
                            consultMethod,
                            consultContent: consultContent.trim(),
                            consultResult
                          };
                          inboxMap.quit = [inboxItem, ...quitList];
                          localStorage.setItem("admin_consult_inbox", JSON.stringify(inboxMap));
                          const moveLogsRaw = localStorage.getItem("admin_consult_move_logs");
                          const moveLogs: string[] = moveLogsRaw ? JSON.parse(moveLogsRaw) : [];
                          moveLogs.push(`${date} 상담기록 이동: ${consultModalFor!.name} → 퇴원 검토 Inbox 처리자: ${admin}`);
                          localStorage.setItem("admin_consult_move_logs", JSON.stringify(moveLogs));
                          alert("상태 변경 완료 • 이탈 시그널 페이지로 이동합니다.");
                          router.push("/admin/alerts");
                        } catch {}
                        setConsultModalFor(null);
                      }
                    }}
                    disabled={
                      !consultDate ||
                      !consultMethod ||
                      (consultContent || "").trim().length < 10 ||
                      !consultResult
                    }
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white disabled:opacity-50"
                    title={
                      !consultDate
                        ? "상담 일자를 입력하세요"
                        : !consultMethod
                        ? "상담 방식을 선택하세요"
                        : (consultContent || "").trim().length < 10
                        ? "상담 내용은 10자 이상 입력하세요"
                        : !consultResult
                        ? "상담 결과를 선택하세요"
                        : ""
                    }
                  >
                    상담 기록 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {leaveConfirmModalFor && (
        <div className="fixed inset-0 z-30 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLeaveConfirmModalFor(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[560px] max-w-[94vw] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">휴원 확정</h3>
              <button onClick={() => setLeaveConfirmModalFor(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">휴원 시작일</span>
                  <input type="date" value={leaveConfStart} onChange={(e) => setLeaveConfStart(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">휴원 종료일</span>
                  <input type="date" value={leaveConfEnd} min={leaveConfStart || undefined} onChange={(e) => setLeaveConfEnd(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700">휴원 사유</span>
                  <textarea value={leaveConfReason} onChange={(e) => setLeaveConfReason(e.target.value)} rows={3} placeholder="최소 10자" className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700 mb-2">환불 / 이월 확인</div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="refundOption" checked={refundOption === "환불 없음"} onChange={() => setRefundOption("환불 없음")} className="rounded border-slate-300" />
                    환불 없음
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="refundOption" checked={refundOption === "부분 환불"} onChange={() => setRefundOption("부분 환불")} className="rounded border-slate-300" />
                    부분 환불
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="refundOption" checked={refundOption === "다음 달 이월"} onChange={() => setRefundOption("다음 달 이월")} className="rounded border-slate-300" />
                    다음 달 이월
                  </label>
                </div>
                <div className="mt-2">
                  <input type="text" value={refundMemo} onChange={(e) => setRefundMemo(e.target.value)} placeholder="환불 메모" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    const ok =
                      !!leaveConfStart &&
                      !!leaveConfEnd &&
                      new Date(leaveConfEnd) > new Date(leaveConfStart) &&
                      (leaveConfReason || "").trim().length >= 10 &&
                      !!refundOption &&
                      (refundMemo || "").trim().length > 0;
                    if (!ok) return;
                    const id = leaveConfirmModalFor!.id;
                    const admin = localStorage.getItem("admin_name") || "관리자";
                    const date = new Date().toISOString().split("T")[0];
                    const newUpdates = { ...updates, [id]: { ...(updates[id] || {}), status: "휴원" as Status } };
                    const newLogs = { ...studentLogs };
                    const list = newLogs[id] || [];
                    list.push(`${date} 휴원 확정 기간: ${leaveConfStart} ~ ${leaveConfEnd} 환불: ${refundOption} 처리자: ${admin}`);
                    newLogs[id] = list;
                    setUpdates(newUpdates);
                    setStudentLogs(newLogs);
                    localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
                    localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
                    try {
                      const raw = localStorage.getItem("admin_leave_effects");
                      const map = raw ? JSON.parse(raw) : {};
                      map[id] = {
                        assignmentsDisabled: true,
                        videosDisabled: true,
                        attendanceExcluded: true,
                        portalRestricted: true,
                        period: { start: leaveConfStart, end: leaveConfEnd }
                      };
                      localStorage.setItem("admin_leave_effects", JSON.stringify(map));
                    } catch {}
                    setLeaveConfirmModalFor(null);
                    setConsultModalFor(null);
                    setLeaveConfStart("");
                    setLeaveConfEnd("");
                    setLeaveConfReason("");
                    setRefundOption("");
                    setRefundMemo("");
                  }}
                  disabled={
                    !leaveConfStart ||
                    !leaveConfEnd ||
                    new Date(leaveConfEnd) <= new Date(leaveConfStart) ||
                    (leaveConfReason || "").trim().length < 10 ||
                    !refundOption ||
                    (refundMemo || "").trim().length === 0
                  }
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white disabled:opacity-50"
                  title={
                    !leaveConfStart
                      ? "휴원 시작일을 입력하세요"
                      : !leaveConfEnd
                      ? "휴원 종료일을 입력하세요"
                      : new Date(leaveConfEnd) <= new Date(leaveConfStart)
                      ? "종료일은 시작일 이후여야 합니다"
                      : (leaveConfReason || "").trim().length < 10
                      ? "사유는 10자 이상 입력하세요"
                      : !refundOption
                      ? "환불/이월 옵션을 선택하세요"
                      : (refundMemo || "").trim().length === 0
                      ? "환불 메모를 입력하세요"
                      : ""
                  }
                >
                  휴원 확정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {infoStudent && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInfoStudent(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[520px] max-w-[90vw] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-slate-900">학생 정보</h3>
              <button onClick={() => setInfoStudent(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">학생 이름</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">영문명</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.englishName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">생년월일</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.birthDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">학부모 성함</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.parentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">학부모 아이디</span>
                <span className="text-sm font-bold text-slate-800">{infoStudent.parentAccountId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">주소</span>
                <span className="text-sm font-bold text-slate-800 text-right">{infoStudent.address}</span>
              </div>
              { (infoStudent.arrivalMethod || infoStudent.arrivalPlace) && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">등원</span>
                  <span className="text-sm font-bold text-slate-800 text-right">{[infoStudent.arrivalMethod, infoStudent.arrivalPlace].filter(Boolean).join(" / ")}</span>
                </div>
              ) }
              { (infoStudent.departureMethod || infoStudent.departurePlace) && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">하원</span>
                  <span className="text-sm font-bold text-slate-800 text-right">{[infoStudent.departureMethod, infoStudent.departurePlace].filter(Boolean).join(" / ")}</span>
                </div>
              ) }
              <div>
                <div className="text-xs font-bold text-slate-400 mb-1">변경 로그</div>
                <div className="space-y-1 max-h-40 overflow-auto">
                  {(studentLogs[infoStudent.id] || []).slice().reverse().map((entry, idx) => (
                    <div key={idx} className="text-xs text-slate-600">{entry}</div>
                  ))}
                  {(studentLogs[infoStudent.id] || []).length === 0 && (
                    <div className="text-xs text-slate-400">로그 없음</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      

      {memoOpenFor && (
        <div className="fixed inset-0 z-30" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={() => setMemoOpenFor(null)} />
          <div
            className={`absolute right-0 top-0 bottom-0 w-[420px] bg-white border-l border-slate-200 shadow-xl p-5 flex flex-col transition-transform duration-300 ease-out ${memoPanelVisible ? "translate-x-0" : "translate-x-full"}`}
            tabIndex={0}
          >
            <h3 id="memo-panel-title" className="text-lg font-black text-slate-900 mb-4">메모</h3>
            <div className="flex-1 overflow-auto space-y-2">
              {(memos[memoOpenFor.id] || []).map((m, i) => (
                <div key={i} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-xs font-bold text-slate-600 mb-1">[{m.tag || "기타"}]</div>
                  <div className="text-sm text-slate-800 break-words whitespace-pre-line">{m.text}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{m.author} • {new Date(m.at).toLocaleString("ko-KR")}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <select
                value={newMemoType}
                onChange={(e) => setNewMemoType(e.target.value as any)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="기타">기타</option>
                <option value="상담">상담</option>
                <option value="결제">결제</option>
                <option value="특이사항">특이사항</option>
              </select>
              <input
                type="text"
                ref={memoInputRef}
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                placeholder="메모 한 줄"
                aria-label="새 메모 입력"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              />
              <button onClick={saveMemo} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">저장</button>
            </div>
          </div>
        </div>
      )}

      {bulkModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeBulkModal} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[520px] max-w-[90vw] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-slate-900">반 변경</h3>
              <button onClick={closeBulkModal} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-900">선택된 원생: {selectedStudentIds.length}명</div>
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-bold text-slate-700">변경할 반</span>
                <select
                  value={selectedTargetClass}
                  onChange={(e) => setSelectedTargetClass(e.target.value)}
                  disabled={!availableClasses.length}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="" disabled>반 선택</option>
                  {availableClasses.map(c => {
                    const disable = merged.some(s => selectedStudentIds.includes(s.id) && s.className === c);
                    return (
                      <option key={c} value={c} disabled={disable}>{c}</option>
                    );
                  })}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="새 반 이름 입력"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                  <button
                    onClick={addNewClassToCatalog}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                    aria-label="새 반 추가"
                  >
                    추가
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-400">반 변경 내역은 자동으로 기록됩니다.</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeBulkModal} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">취소</button>
              <button
                onClick={handleBulkClassChange}
                disabled={
                  !selectedTargetClass ||
                  selectedStudentIds.length === 0 ||
                  merged.some(s => selectedStudentIds.includes(s.id) && s.className === selectedTargetClass)
                }
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
              >
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}
      {bulkBusOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeBulkBusModal} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[520px] max-w-[90vw] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-slate-900">호차 변경</h3>
              <button onClick={closeBulkBusModal} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-900">선택된 원생: {selectedStudentIds.length}명</div>
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-bold text-slate-700">변경할 호차</span>
                <select
                  value={selectedTargetBus}
                  onChange={(e) => setSelectedTargetBus(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">선택</option>
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
              <div className="text-xs text-slate-400">변경 내역은 자동으로 기록됩니다.</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeBulkBusModal} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">취소</button>
              <button
                onClick={handleBulkBusChange}
                disabled={!selectedTargetBus || selectedStudentIds.length === 0}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white disabled:opacity-50"
              >
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}
      {bulkTimeOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeBulkTimeModal} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[520px] max-w-[90vw] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-slate-900">하원 시간대 변경</h3>
              <button onClick={closeBulkTimeModal} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-900">선택된 원생: {selectedStudentIds.length}명</div>
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-bold text-slate-700">변경할 시간대</span>
                <select
                  value={selectedTargetTime}
                  onChange={(e) => setSelectedTargetTime(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">선택</option>
                  <option value="09:00">09:00</option>
                  <option value="13:30">13:30</option>
                  <option value="16:30">16:30</option>
                </select>
              </div>
              <div className="text-xs text-slate-400">변경 내역은 자동으로 기록됩니다.</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeBulkTimeModal} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">취소</button>
              <button
                onClick={handleBulkTimeChange}
                disabled={!selectedTargetTime || selectedStudentIds.length === 0}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white disabled:opacity-50"
              >
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}
      {busModalFor && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBusModalFor(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[480px] max-w-[90vw] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-slate-900">호차 변경</h3>
              <button onClick={() => setBusModalFor(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">학생 이름</span>
                  <span className="text-sm font-bold text-slate-800">{busModalFor.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">현재 호차</span>
                  <span className="text-sm font-bold text-slate-800">{(updates[busModalFor.id]?.bus || busModalFor.bus)}</span>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-bold text-slate-700">변경할 호차</span>
                <select
                  value={selectedBus}
                  onChange={(e) => setSelectedBus(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">선택</option>
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
              <div className="text-xs text-slate-400">변경 내역은 자동으로 기록됩니다.</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setBusModalFor(null)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">취소</button>
              <button
                onClick={() => {
                  if (!selectedBus) return;
                  const id = busModalFor.id;
                  const admin = localStorage.getItem("admin_name") || "관리자";
                  const date = new Date().toISOString().split("T")[0];
                  const oldBus = (updates[id]?.bus || busModalFor.bus);
                  if (oldBus === selectedBus) return;
                  const newUpdates = { ...updates, [id]: { ...(updates[id] || {}), bus: selectedBus } };
                  const entry = `${date} 호차 변경: ${oldBus} → ${selectedBus} 처리자: ${admin}`;
                  const newLogs = { ...studentLogs };
                  const list = newLogs[id] || [];
                  list.push(entry);
                  newLogs[id] = list;
                  setUpdates(newUpdates);
                  setStudentLogs(newLogs);
                  localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
                  localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
                  setBusModalFor(null);
                  setSelectedBus("");
                }}
                disabled={!selectedBus}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white disabled:opacity-50"
              >
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}
      {timeModalFor && (
        <div className="fixed inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setTimeModalFor(null)} />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-[480px] max-w-[90vw] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-slate-900">하원 시간대 변경</h3>
              <button onClick={() => setTimeModalFor(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">닫기</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">학생 이름</span>
                  <span className="text-sm font-bold text-slate-800">{timeModalFor.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">현재 시간대</span>
                  <span className="text-sm font-bold text-slate-800">{(updates[timeModalFor.id]?.departureTime || timeModalFor.departureTime)}</span>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-bold text-slate-700">변경할 시간대</span>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">선택</option>
                  <option value="09:00">09:00</option>
                  <option value="13:30">13:30</option>
                  <option value="16:30">16:30</option>
                </select>
              </div>
              <div className="text-xs text-slate-400">변경 내역은 자동으로 기록됩니다.</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setTimeModalFor(null)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">취소</button>
              <button
                onClick={() => {
                  if (!selectedTime) return;
                  const id = timeModalFor.id;
                  const admin = localStorage.getItem("admin_name") || "관리자";
                  const date = new Date().toISOString().split("T")[0];
                  const oldTime = (updates[id]?.departureTime || timeModalFor.departureTime);
                  if (oldTime === selectedTime) return;
                  const newUpdates = { ...updates, [id]: { ...(updates[id] || {}), departureTime: selectedTime } };
                  const entry = `${date} 하원 시간대 변경: ${oldTime} → ${selectedTime} 처리자: ${admin}`;
                  const newLogs = { ...studentLogs };
                  const list = newLogs[id] || [];
                  list.push(entry);
                  newLogs[id] = list;
                  setUpdates(newUpdates);
                  setStudentLogs(newLogs);
                  localStorage.setItem("admin_student_updates", JSON.stringify(newUpdates));
                  localStorage.setItem("admin_student_logs", JSON.stringify(newLogs));
                  setTimeModalFor(null);
                  setSelectedTime("");
                }}
                disabled={!selectedTime}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white disabled:opacity-50"
              >
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
