"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { StudentFull } from "@/lib/types";
import { StatusModal, ConsultModal, ClassModal } from "./StudentModals";

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
  const [birthMonth, setBirthMonth] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [dajimFilter, setDajimFilter] = useState<"All" | "O" | "X">("All");
  const [showOnlyActive, setShowOnlyActive] = useState<boolean>(true);
  
  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number>(0);

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

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<StudentFull | null>(null);

  const [students, setStudents] = useState<StudentFull[]>([]);

  const refetch = async () => {
    try {
      const params = new URLSearchParams({
        campus: campusFilter,
        classId: classFilter,
        dajim: dajimFilter,
        name: query,
        birthMonth,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const data = await res.json();
      setStudents(data.items ?? []);
      setTotalCount(data.totalCount ?? 0);
    } catch {}
  };

  useEffect(() => {
    refetch();
  }, [campusFilter, classFilter, dajimFilter, query, birthMonth, page, pageSize]);

  useEffect(() => {
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
  }, [campusFilter, classFilter, dajimFilter, query, birthMonth, page, pageSize]);

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
      const mStatus = true; // Status filtering disabled
      const mBirth = true; // 생일 필터는 서버에서 처리
      const mDajim = dajimFilter === "All"
        ? true
        : dajimFilter === "O"
        ? s.dajim_enabled
        : !s.dajim_enabled;
      const mQuery =
        query === "" ||
        s.student_name.includes(query);

      return mCampus && mClass && mStatus && mBirth && mDajim && mQuery;
    });
    return list;
  }, [merged, campusFilter, classFilter, birthMonth, query, showOnlyActive, statusToggle, dajimFilter]);

  const availableClasses = useMemo(() => {
    return filters.classes.map(c => c.name).sort();
  }, [filters.classes]);


  useEffect(() => {}, [students]);

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
    
    // Find the class object to get the name for logging
    const targetClassObj = filters.regularClasses.find(c => c.id === selectedTargetClass);
    if (!targetClassObj) return;
    const targetClassName = targetClassObj.name;

    const selectedStudents = merged.filter(s => selectedStudentIds.includes(s.id));
    if (!selectedStudents.length) return;
    
    // Filter out students who are already in this class (optional, but good for efficiency)
    // Checking against class_name might be risky if names aren't synced, but it's a reasonable check.
    // Or just update everyone. Let's update everyone to be safe.
    
    try {
      const newUpdates = { ...updates };
      const newLogs = { ...studentLogs };
      const { data } = await supabase.auth.getUser();
      const admin = String(data?.user?.email ?? "관리자");
      const date = new Date().toISOString().split("T")[0];

      // We can use Promise.all for better performance
      await Promise.all(selectedStudents.map(async (s) => {
        const oldClass = s.class_name;
        if (oldClass === targetClassName) return; // Skip if same

        newUpdates[s.id] = { ...(newUpdates[s.id] || {}), class_name: targetClassName };
        const entry = `${date} 반 일괄 변경: ${oldClass} → ${targetClassName} 처리자: ${admin}`;
        const list = newLogs[s.id] || [];
        list.push(entry);
        newLogs[s.id] = list;
        
        // Update main_class_id in DB
        await supabase.from("students").update({ main_class_id: selectedTargetClass }).eq("id", s.id);

        await supabase.from("student_status_logs").insert({
          student_id: s.id,
          type: "class_change",
          message: entry,
          at: new Date().toISOString(),
        });
      }));

      setUpdates(newUpdates);
      setStudentLogs(newLogs);
      setSelectedStudentIds([]);
      setSelectedTargetClass("");
      closeBulkModal();
      refetch(); // Refresh to ensure data consistency
    } catch {
      alert("일괄 변경 중 오류가 발생했습니다.");
    }
  };

  const addNewClassToCatalog = () => {
    // Deprecated
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





  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">원생 관리</h1>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end mb-6">
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
          <span className="text-sm font-bold text-slate-700">생일</span>
          <select
            value={birthMonth}
            onChange={(e) => setBirthMonth(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white w-[120px]"
          >
            <option value="All">전체</option>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {i + 1}월
              </option>
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
        {/* Active only filter removed */}
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

      {/* Status filters removed */}

      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600 font-bold">
            총 <span className="text-frage-blue">{totalCount}</span>명 중 {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalCount)}명 표시
          </div>
          {selectedStudentIds.length > 0 && (
            <button
              onClick={openBulkModal}
              className="px-3 py-1.5 bg-frage-blue text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors animate-in fade-in slide-in-from-left-2"
            >
              선택한 {selectedStudentIds.length}명 반 일괄 변경
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="px-3 py-1.5 text-sm font-bold text-slate-700">
              {page} / {Math.ceil(totalCount / pageSize) || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
              disabled={page >= Math.ceil(totalCount / pageSize)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
          
          <div className="h-6 w-px bg-slate-200 mx-2"></div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white font-bold text-slate-700 cursor-pointer hover:border-slate-300"
          >
            <option value={50}>50명씩</option>
            <option value={100}>100명씩</option>
            <option value={200}>200명씩</option>
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
                <th className="p-3 font-bold w-32">반</th>
                <th className="p-3 font-bold w-32">생년월일</th>
                <th className="p-3 font-bold w-24">캠퍼스</th>
                <th className="p-3 font-bold w-16 text-center">차량</th>
                <th className="p-3 font-bold w-12 text-center">다짐</th>
                <th className="p-3 font-bold w-24 text-center">메모</th>
                <th className="p-3 font-bold w-16 text-center">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
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
                  <td className="p-3 text-slate-700">{s.class_name}</td>
                  <td className="p-3 text-sm text-slate-600">{s.birth_date}</td>
                  <td className="p-3 text-sm text-slate-600">{s.campus}</td>
                  <td className="p-3 text-center text-sm text-slate-600">{s.has_transport ? "O" : "-"}</td>
                  <td className="p-3 text-slate- text-slate-700 font-bold">
                    {s.dajim_enabled ? <span className="text-green-600">✔</span> : <span className="text-slate-300">-</span>}
                  </td>
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
                            setTargetStudent(s);
                            setStatusModalOpen(true);
                          }}
                        >
                          상태 변경
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => {
                            setTargetStudent(s);
                            setConsultModalOpen(true);
                          }}
                          title="상담 기록"
                        >
                          상담 기록
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={() => {
                            setTargetStudent(s);
                            setClassModalOpen(true);
                          }}
                        >
                          반 변경
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
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-1">변경할 반 (메인 클래스)</label>
              <select
                value={selectedTargetClass}
                onChange={(e) => setSelectedTargetClass(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">(선택하세요)</option>
                {filters.regularClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-2">
              <button onClick={closeBulkModal} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">취소</button>
              <button 
                onClick={handleBulkClassChange} 
                disabled={!selectedTargetClass}
                className="px-4 py-2 text-sm font-bold text-white bg-frage-blue rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                변경하기
              </button>
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


              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setInfoStudent(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100">닫기</button>
            </div>
          </div>
        </div>
      )}

      <StatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        student={targetStudent}
        onSuccess={refetch}
      />
      <ConsultModal
        open={consultModalOpen}
        onClose={() => setConsultModalOpen(false)}
        student={targetStudent}
        onSuccess={refetch}
      />
      <ClassModal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        student={targetStudent}
        onSuccess={refetch}
        mainClasses={filters.regularClasses}
        programClasses={filters.programClasses}
      />


    </main>
  );
}
