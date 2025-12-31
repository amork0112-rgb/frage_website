"use client";

import { useEffect, useMemo, useState } from "react";
import { Bus, Clock, AlertTriangle } from "lucide-react";

type Status = "재원" | "휴원" | "퇴원";

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

type BusCar = {
  id: string;
  name: string;
  staff: string;
  timeSlot: string;
};

export default function AdminTransportPage() {
  const [role, setRole] = useState<"admin" | "teacher">("admin");
  const [campusFilter, setCampusFilter] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<string>("All");
  const [busFilter, setBusFilter] = useState<string>("All");
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [requests, setRequests] = useState<{ id: string; childId: string; childName: string; type: "bus_change"; note?: string; dateStart: string }[]>([]);
  const [mode, setMode] = useState<"dropoff" | "pickup">("dropoff");
  const [arrivalTimes, setArrivalTimes] = useState<Record<string, string>>({});
  const [busCars, setBusCars] = useState<BusCar[]>([]);
  const [newBusName, setNewBusName] = useState("");
  const [newBusStaff, setNewBusStaff] = useState("");
  const [newBusTime, setNewBusTime] = useState("");
  const [orderMap, setOrderMap] = useState<Record<string, string[]>>({});
  const [studentUpdates, setStudentUpdates] = useState<Record<string, { departureTime?: string }>>({});

  useEffect(() => {
    try {
      const r = localStorage.getItem("admin_role");
      setRole(r === "teacher" ? "teacher" : "admin");
      const rawReq = localStorage.getItem("portal_requests");
      const list = rawReq ? JSON.parse(rawReq) : [];
      const busReqs = (Array.isArray(list) ? list : []).filter((x: any) => x.type === "bus_change");
      setRequests(busReqs);
      const rawArr = localStorage.getItem("admin_arrival_times");
      const map = rawArr ? JSON.parse(rawArr) : {};
      setArrivalTimes(map || {});
      const updRaw = localStorage.getItem("admin_student_updates");
      const updMap = updRaw ? JSON.parse(updRaw) : {};
      setStudentUpdates(updMap || {});
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/students?pageSize=400");
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        let mergedItems: Student[] = items;
        try {
          const bulkRaw = localStorage.getItem("admin_bulk_students");
          const bulkArr: Student[] = bulkRaw ? JSON.parse(bulkRaw) : [];
          if (Array.isArray(bulkArr) && bulkArr.length > 0) {
            mergedItems = [...mergedItems, ...bulkArr];
          }
          const rawProfiles = localStorage.getItem("signup_profiles");
          const profiles = rawProfiles ? JSON.parse(rawProfiles) : [];
          const arr: any[] = Array.isArray(profiles) ? profiles : [];
          if (arr.length > 0) {
            const existingPhones = new Set(mergedItems.map(s => s.phone));
            const mapped: Student[] = arr
              .filter(p => (p?.phone || "").trim() !== "")
              .map((p, idx) => ({
                id: `signup_${(p.phone || String(idx)).replace(/[^0-9a-zA-Z]/g, "")}`,
                childId: undefined,
                name: String(p.studentName || "").trim(),
                englishName: String(p.englishFirstName || p.passportEnglishName || "").trim(),
                birthDate: String(p.childBirthDate || "").trim(),
                phone: String(p.phone || "").trim(),
                className: "미배정",
                campus: "미지정",
                status: "재원" as Status,
                parentName: String(p.parentName || "").trim(),
                parentAccountId: String(p.id || "").trim(),
                address: [String(p.address || "").trim(), String(p.addressDetail || "").trim()].filter(Boolean).join(" "),
                bus: "미배정",
                departureTime: "",
                arrivalMethod: String(p.arrivalMethod || "").trim(),
                arrivalPlace: String(p.arrivalPlace || "").trim(),
                departureMethod: String(p.departureMethod || "").trim(),
                departurePlace: String(p.departurePlace || "").trim()
              }))
              .filter(s => !existingPhones.has(s.phone));
            mergedItems = [...mergedItems, ...mapped];
          }
        } catch {}
        setStudents(mergedItems);
      } catch {}
    };
    load();
    try {
      const raw = localStorage.getItem("admin_bus_cars");
      let list: BusCar[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list) || list.length === 0) {
        list = [
          { id: "b1", name: "1호차", staff: "김기사 / 박교사", timeSlot: "16:00" },
          { id: "b2", name: "2호차", staff: "이기사 / 최교사", timeSlot: "16:30" },
          { id: "b3", name: "3호차", staff: "박기사 / 장교사", timeSlot: "17:00" },
          { id: "b4", name: "4호차", staff: "정기사 / 윤교사", timeSlot: "17:30" },
          { id: "b5", name: "5호차", staff: "오기사 / 김교사", timeSlot: "18:00" },
          { id: "b6", name: "6호차", staff: "최기사 / 이교사", timeSlot: "18:30" },
          { id: "b7", name: "7호차", staff: "한기사 / 임교사", timeSlot: "19:00" },
        ];
        localStorage.setItem("admin_bus_cars", JSON.stringify(list));
      }
      setBusCars(list);
    } catch {
      setBusCars([]);
    }
  }, []);

  useEffect(() => {
    try {
      const key = "admin_transport_assignments";
      const raw = localStorage.getItem(key);
      const all = raw ? JSON.parse(raw) : {};
      const scopeKey = `${campusFilter}-${timeFilter}`;
      setAssignments(all[scopeKey] || {});
      const omRaw = localStorage.getItem("admin_transport_order");
      const omAll = omRaw ? JSON.parse(omRaw) : {};
      setOrderMap(omAll[scopeKey] || {});
    } catch {
      setAssignments({});
      setOrderMap({});
    }
  }, [campusFilter, timeFilter]);

  const parseTime = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
    if (!m) return Number.MAX_SAFE_INTEGER;
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    return hh * 60 + mm;
  };

  const busCarsSorted: BusCar[] = useMemo(() => {
    return (busCars || []).slice().sort((a, b) => parseTime(a.timeSlot) - parseTime(b.timeSlot));
  }, [busCars]);

  const colorForBus = (busName: string) =>
    busName === "1호차"
      ? "bg-red-500"
      : busName === "2호차"
      ? "bg-blue-500"
      : busName === "3호차"
      ? "bg-green-500"
      : busName === "4호차"
      ? "bg-purple-500"
      : busName === "5호차"
      ? "bg-amber-500"
      : busName === "6호차"
      ? "bg-pink-500"
      : busName === "7호차"
      ? "bg-teal-500"
      : "bg-slate-400";

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => (campusFilter === "All" ? true : s.campus === campusFilter))
      .filter((s) => (timeFilter === "All" ? true : (studentUpdates[s.id]?.departureTime || s.departureTime).startsWith(timeFilter) || (studentUpdates[s.id]?.departureTime || s.departureTime) === timeFilter));
  }, [students, campusFilter, timeFilter, studentUpdates]);

  const assignedListFor = (busName: string) => {
    const list = filteredStudents.filter((s) => (assignments[s.id] || s.bus) === busName).slice();
    const order = orderMap[busName] || [];
    const indexOf = (id: string) => {
      const idx = order.indexOf(id);
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };
    return list.sort((a, b) => indexOf(a.id) - indexOf(b.id));
  };

  const unassignedList = useMemo(() => {
    return filteredStudents.filter(s => {
      const assignedBus = assignments[s.id] || s.bus;
      const isUnassigned = !assignedBus || assignedBus === "미배정" || assignedBus === "없음";
      const isShuttle = 
        mode === "pickup" ? (s.arrivalMethod || "").includes("셔틀") :
        mode === "dropoff" ? (s.departureMethod || "").includes("셔틀") :
        false;
      const hasRequest = requests.some(r => r.childId === s.childId || r.childName === s.name);
      return isUnassigned && (isShuttle || hasRequest);
    });
  }, [filteredStudents, assignments, mode, requests]);

  const hasBusChangeRequest = (s: Student) =>
    !!requests.find((r) => r.childId === s.childId || r.childName === s.name);

  const canEdit = role === "admin";

  const onDropToBus = (busName: string, e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    const id = e.dataTransfer.getData("student_id");
    const fromBus = e.dataTransfer.getData("from_bus");
    if (!id) return;
    const nextAssign = { ...assignments, [id]: busName };
    setAssignments(nextAssign);
    const scopeKey = `${campusFilter}-${timeFilter}`;
    try {
      const raw = localStorage.getItem("admin_transport_assignments");
      const all = raw ? JSON.parse(raw) : {};
      all[scopeKey] = nextAssign;
      localStorage.setItem("admin_transport_assignments", JSON.stringify(all));
    } catch {}
    const nextOrder = { ...orderMap };
    const removeFrom = (bn: string) => {
      const arr = nextOrder[bn] || [];
      nextOrder[bn] = arr.filter((sid) => sid !== id);
    };
    if (fromBus) removeFrom(fromBus);
    const arr = nextOrder[busName] || [];
    nextOrder[busName] = [...arr, id];
    setOrderMap(nextOrder);
    try {
      const omRaw = localStorage.getItem("admin_transport_order");
      const omAll = omRaw ? JSON.parse(omRaw) : {};
      omAll[scopeKey] = nextOrder;
      localStorage.setItem("admin_transport_order", JSON.stringify(omAll));
    } catch {}
    setDirty(true);
  };

  const onDragStartStudent = (id: string, busName: string, e: React.DragEvent) => {
    e.dataTransfer.setData("student_id", id);
    e.dataTransfer.setData("from_bus", busName);
  };

  const onDropOnItem = (busName: string, targetId: string, e: React.DragEvent) => {
    if (!canEdit) return;
    const id = e.dataTransfer.getData("student_id");
    const fromBus = e.dataTransfer.getData("from_bus");
    if (!id) return;
    const nextOrder = { ...orderMap };
    const clean = (bn: string) => {
      const arr = nextOrder[bn] || [];
      nextOrder[bn] = arr.filter((sid) => sid !== id);
    };
    if (fromBus) clean(fromBus);
    const arr = nextOrder[busName] || [];
    const idx = arr.indexOf(targetId);
    const newArr = [...arr];
    if (!newArr.includes(id)) {
      newArr.splice(idx, 0, id);
    } else {
      const oldIdx = newArr.indexOf(id);
      newArr.splice(oldIdx, 1);
      const insertIdx = newArr.indexOf(targetId);
      newArr.splice(insertIdx, 0, id);
    }
    nextOrder[busName] = newArr;
    setOrderMap(nextOrder);
    const scopeKey = `${campusFilter}-${timeFilter}`;
    try {
      const omRaw = localStorage.getItem("admin_transport_order");
      const omAll = omRaw ? JSON.parse(omRaw) : {};
      omAll[scopeKey] = nextOrder;
      localStorage.setItem("admin_transport_order", JSON.stringify(omAll));
    } catch {}
    setDirty(true);
  };

  const updateArrivalTime = (id: string, t: string) => {
    const next = { ...arrivalTimes, [id]: t };
    setArrivalTimes(next);
    try {
      localStorage.setItem("admin_arrival_times", JSON.stringify(next));
    } catch {}
  };

  const updateDepartureTime = (id: string, t: string) => {
    const updRaw = localStorage.getItem("admin_student_updates");
    const updMap = updRaw ? JSON.parse(updRaw) : {};
    const prev = updMap[id] || {};
    const nextMap = { ...updMap, [id]: { ...prev, departureTime: t } };
    setStudentUpdates(nextMap);
    try {
      localStorage.setItem("admin_student_updates", JSON.stringify(nextMap));
    } catch {}
  };

  const saveAll = () => {
    try {
      const key = "admin_transport_assignments";
      const raw = localStorage.getItem(key);
      const all = raw ? JSON.parse(raw) : {};
      const scopeKey = `${campusFilter}-${timeFilter}`;
      all[scopeKey] = assignments;
      localStorage.setItem(key, JSON.stringify(all));
    } catch {}
    try {
      const omRaw = localStorage.getItem("admin_transport_order");
      const omAll = omRaw ? JSON.parse(omRaw) : {};
      const scopeKey = `${campusFilter}-${timeFilter}`;
      omAll[scopeKey] = orderMap;
      localStorage.setItem("admin_transport_order", JSON.stringify(omAll));
    } catch {}
    setDirty(false);
  };
  const saveBusCars = (next: BusCar[]) => {
    setBusCars(next);
    try {
      localStorage.setItem("admin_bus_cars", JSON.stringify(next));
    } catch {}
  };
  const addBusCar = () => {
    if (!canEdit) return;
    const name = newBusName.trim();
    const staff = newBusStaff.trim();
    const timeSlot = newBusTime.trim();
    if (!name || !staff || !/^\d{1,2}:\d{2}$/.test(timeSlot)) return;
    const id = `b_${Date.now().toString(36)}`;
    const next = [...busCars, { id, name, staff, timeSlot }];
    saveBusCars(next);
    setNewBusName("");
    setNewBusStaff("");
    setNewBusTime("");
  };
  const updateBusCar = (id: string, patch: Partial<BusCar>) => {
    if (!canEdit) return;
    const next = busCars.map((b) => (b.id === id ? { ...b, ...patch } : b));
    saveBusCars(next);
  };
  const removeBusCar = (id: string) => {
    if (!canEdit) return;
    const next = busCars.filter((b) => b.id !== id);
    saveBusCars(next);
  };

  // 지도 및 지오코딩 관련 로직 제거

  // 지도 렌더링 제거

  return (
    <main dir="ltr" style={{ writingMode: "horizontal-tb" }} className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Bus className="w-6 h-6 text-frage-yellow" />
          <h1 className="text-2xl font-black text-slate-900 whitespace-nowrap">차량 관리</h1>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-slate-700 whitespace-nowrap">운영</span>
            <div className="flex gap-2">
              {[
                { k: "dropoff", label: "하원" },
                { k: "pickup", label: "등원" },
              ].map((o) => (
                <button
                  key={o.k}
                  onClick={() => setMode(o.k as any)}
                  className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg border text-xs md:text-sm font-bold ${
                    mode === o.k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-slate-700 whitespace-nowrap">캠퍼스</span>
            <div className="flex gap-2 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-normal md:flex-wrap -mx-1 px-1">
              {["All", "International", "Andover", "Platz", "Atheneum"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCampusFilter(c)}
                  className={`shrink-0 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border text-xs md:text-sm font-bold ${
                    campusFilter === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {c === "All" ? "전체" : c === "International" ? "국제관" : c === "Andover" ? "앤도버" : c === "Platz" ? "플라츠" : "아테네움관"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-slate-700 whitespace-nowrap">시간대</span>
            <div className="flex gap-2 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-normal md:flex-wrap -mx-1 px-1">
              {["All", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`shrink-0 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border text-xs md:text-sm font-bold ${
                    timeFilter === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {t === "All" ? "전체" : t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-slate-700 whitespace-nowrap">호차</span>
            <div className="flex gap-2 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-normal md:flex-wrap -mx-1 px-1">
              {["All", ...busCarsSorted.map((b) => b.name)].map((b) => (
                <button
                  key={b}
                  onClick={() => setBusFilter(b)}
                  className={`shrink-0 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border text-xs md:text-sm font-bold ${
                    busFilter === b ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!canEdit && (
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
          <AlertTriangle className="w-4 h-4 text-slate-500" />
          열람 전용입니다. 권한이 있는 계정으로 로그인하세요.
        </div>
      )}

      {unassignedList.length > 0 && (
        <div className="mb-6 bg-orange-50 rounded-2xl border border-orange-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white font-bold text-xs">!</div>
            <div className="text-sm font-bold text-slate-900">미배정 (셔틀 요청)</div>
            <div className="text-xs text-orange-600 font-bold">{unassignedList.length}명</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedList.map(s => (
              <div
                key={s.id}
                draggable={canEdit}
                onDragStart={(e) => onDragStartStudent(s.id, "미배정", e)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-200 bg-white shadow-sm cursor-grab active:cursor-grabbing"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">{s.name}</span>
                  <span className="text-xs text-slate-500">{s.className}</span>
                </div>
                {mode === "pickup" && s.arrivalPlace && (
                  <div className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    등원: {s.arrivalPlace}
                  </div>
                )}
                {mode === "dropoff" && s.departurePlace && (
                  <div className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    하원: {s.departurePlace}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-bold text-slate-700">호차 배치</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <input
                  value={newBusName}
                  onChange={(e) => setNewBusName(e.target.value)}
                  placeholder="호차명(예: 7호차)"
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  value={newBusStaff}
                  onChange={(e) => setNewBusStaff(e.target.value)}
                  placeholder="담당자"
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  value={newBusTime}
                  onChange={(e) => setNewBusTime(e.target.value)}
                  placeholder="시간대(HH:MM)"
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs"
                />
                <button onClick={addBusCar} className="px-2 py-1 rounded-lg bg-frage-navy text-white text-xs font-bold">추가</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 p-4">
            {busCarsSorted
              .filter((b) => (busFilter === "All" ? true : b.name === busFilter))
              .map((b) => {
                const list = assignedListFor(b.name);
                return (
                  <div
                    key={b.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDropToBus(b.name, e)}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm p-4"
                  >
                    <div className="flex flex-row items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${colorForBus(b.name)} text-white font-bold text-xs`}>{b.name.replace("호차","")}</span>
                        <div>
                          <div className="text-sm font-bold text-slate-900 text-left whitespace-normal break-words">{b.name}</div>
                          <div className="text-xs text-slate-500 text-left whitespace-normal break-words">{b.staff}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                        <Clock className="w-3 h-3" />
                        {b.timeSlot}
                        {canEdit && (
                          <div className="flex items-center gap-1 ml-2">
                            <input
                              defaultValue={b.name}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (!v) return;
                                updateBusCar(b.id, { name: v });
                              }}
                              className="px-2 py-1 rounded border border-slate-200 text-[11px]"
                            />
                            <input
                              defaultValue={b.staff}
                              onBlur={(e) => updateBusCar(b.id, { staff: e.target.value })}
                              className="px-2 py-1 rounded border border-slate-200 text-[11px]"
                            />
                            <input
                              defaultValue={b.timeSlot}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (!/^\d{1,2}:\d{2}$/.test(v)) return;
                                updateBusCar(b.id, { timeSlot: v });
                              }}
                              className="px-2 py-1 rounded border border-slate-200 text-[11px] w-20"
                            />
                            <button onClick={() => removeBusCar(b.id)} className="px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700 text-[11px]">삭제</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {list.length === 0 && <div className="text-xs text-slate-500">배정된 원생 없음</div>}
                      {list.map((s) => (
                        <div
                          key={s.id}
                          draggable={canEdit}
                          onDragStart={(e) => onDragStartStudent(s.id, b.name, e)}
                          onDrop={(e) => onDropOnItem(b.name, s.id, e)}
                          onDragOver={(e) => e.preventDefault()}
                          className="flex flex-row items-center justify-between px-3 py-3 rounded-lg border border-slate-200 bg-white"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-bold text-slate-900 text-left whitespace-normal break-words">{s.name}</div>
                            <div className="text-xs text-slate-600 text-left whitespace-normal break-words">{s.className}</div>
                            {mode === "pickup" && s.arrivalPlace && (
                              <div className="mt-1 text-[11px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block">
                                등원: {s.arrivalPlace}
                              </div>
                            )}
                            {mode === "dropoff" && s.departurePlace && (
                              <div className="mt-1 text-[11px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block">
                                하원: {s.departurePlace}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {mode === "pickup" ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500">등원</span>
                                <input
                                  type="time"
                                  value={arrivalTimes[s.id] || "08:30"}
                                  onChange={(e) => updateArrivalTime(s.id, e.target.value)}
                                  className="px-2 py-1 rounded border border-slate-200 text-xs w-24"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500">하원</span>
                                <input
                                  type="time"
                                  value={studentUpdates[s.id]?.departureTime || s.departureTime || "16:30"}
                                  onChange={(e) => updateDepartureTime(s.id, e.target.value)}
                                  className="px-2 py-1 rounded border border-slate-200 text-xs w-24"
                                />
                              </div>
                            )}
                            <div className="text-xs text-slate-400 select-none" title="드래그하여 순서 변경">↕︎</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {dirty && canEdit && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl border border-slate-200 shadow-lg px-4 py-3 flex items-center gap-3 z-50">
          <span className="text-sm font-bold text-slate-700">변경 사항이 있습니다</span>
          <button
            onClick={saveAll}
            className="px-3 py-2 rounded-lg bg-frage-navy text-white text-sm font-bold"
          >
            저장
          </button>
        </div>
      )}
    </main>
  );
}
 
