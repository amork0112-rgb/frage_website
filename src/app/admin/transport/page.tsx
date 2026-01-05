"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bus, Clock, AlertTriangle, Save, Sparkles } from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";

type TimeSlot = {
  id: string;
  label: string;
  base_time: string;
};

type Bus = {
  id: number;
  name: string;
  capacity: number;
  assignedCount: number;
  estimatedTime: number;
};

type Student = {
  id: string;
  name: string;
  className: string;
  campus: string;
  flags?: {
    sibling?: boolean;
    timeSensitive?: boolean;
    warning?: boolean;
  };
};

type RouteBlock = {
  id: string;
  label: string;
  order: number;
  estimatedExtraTime: number;
  students: Student[];
};

export default function AdminTransportPage() {
  const router = useRouter();
  const [semester, setSemester] = useState<string>(() => {
    const d = new Date();
    const term = d.getMonth() < 6 ? "1" : "2";
    return `${d.getFullYear()}-${term}`;
  });
  const [campus, setCampus] = useState<string>("All");
  const [mode, setMode] = useState<"pickup" | "dropoff">("pickup");
  const [dirty, setDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedBusId, setSelectedBusId] = useState<number>(2);
  const [weekday, setWeekday] = useState<number>(2);
  const [timeSlotId, setTimeSlotId] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routesByBus, setRoutesByBus] = useState<Record<number, RouteBlock[]>>({});
  const [routeIds, setRouteIds] = useState<Record<number, string>>({});

  const getMyRole = async (): Promise<"admin" | "teacher" | "parent"> => {
    const { data, error } = await supabase.from("profiles").select("role").single();
    if (error) throw error;
    return (data as any).role as "admin" | "teacher" | "parent";
  };

  useEffect(() => {
    (async () => {
      try {
        const role = await getMyRole();
        if (role === "parent") {
          router.replace("/portal");
        }
      } catch {}
    })();
  }, []);

  const fetchTimeSlots = async () => {
    try {
      if (!supabaseReady || campus === "All") {
        setTimeSlots([]);
        setTimeSlotId(null);
        return;
      }
      const { data } = await supabase
        .from("time_slots")
        .select("id,label,base_time")
        .eq("campus", campus)
        .eq("route_type", mode)
        .eq("is_active", true)
        .order("sort_order");
      const list = (data || []).map((t: any) => ({
        id: String(t.id),
        label: String(t.label || ""),
        base_time: String(t.base_time || ""),
      }));
      setTimeSlots(list);
      setTimeSlotId(list[0]?.id ?? null);
    } catch {
      setTimeSlots([]);
      setTimeSlotId(null);
    }
  };

  const fetchBuses = async (campusVal: string) => {
    try {
      if (supabaseReady && campusVal !== "All") {
        const { data, error } = await supabase
          .from("buses")
          .select("id,name,capacity")
          .eq("campus", campusVal)
          .eq("is_active", true)
          .order("id");
        if (error) throw error;
        const list = (data || []).map((b: any) => ({
          id: Number(b.id),
          name: String(b.name || ""),
          capacity: Number(b.capacity ?? 12),
          assignedCount: 0,
          estimatedTime: 0,
        }));
        if (list.length > 0) {
          setBuses(list);
          setSelectedBusId(list[0].id);
          return;
        }
      }
      const fallback = Array.from({ length: 6 }, (_, i) => {
        const id = i + 2;
        return { id, name: `${id}호차`, capacity: 12, assignedCount: 0, estimatedTime: 0 };
      });
      setBuses(fallback);
      setSelectedBusId(fallback[0].id);
    } catch {
      const fallback = Array.from({ length: 6 }, (_, i) => {
        const id = i + 2;
        return { id, name: `${id}호차`, capacity: 12, assignedCount: 0, estimatedTime: 0 };
      });
      setBuses(fallback);
      setSelectedBusId(fallback[0].id);
    }
  };

  const fetchRouteDetail = async (opts: { semester: string; busId: number; routeType: "pickup" | "dropoff"; timeSlotId: string | null; weekday: number }) => {
    try {
      if (supabaseReady) {
        const { data, error } = await supabase
          .from("bus_routes")
          .select(
            `
            id,
            estimated_total_time,
            is_confirmed,
            route_blocks (
              id,
              label,
              block_order,
              estimated_extra_time,
              route_block_students (
                id,
                student_id,
                students (
                  id,
                  name,
                  class_name,
                  campus
                )
              )
            )
          `
          )
          .eq("semester", opts.semester)
          .eq("bus_id", opts.busId)
          .eq("route_type", opts.routeType)
          .eq("time_slot_id", opts.timeSlotId)
          .eq("weekday", opts.weekday)
          .single();
        if (error) throw error;
        const blocks: RouteBlock[] = Array.isArray((data as any)?.route_blocks)
          ? (data as any).route_blocks.map((block: any) => ({
              id: String(block.id),
              label: String(block.label || ""),
              order: Number(block.block_order ?? 0),
              estimatedExtraTime: Number(block.estimated_extra_time ?? 0),
              students: Array.isArray(block.route_block_students)
                ? block.route_block_students
                    .map((rbs: any) => rbs.students)
                    .filter(Boolean)
                    .map((s: any) => ({
                      id: String(s.id),
                      name: String(s.name || ""),
                      className: String(s.class_name || ""),
                      campus: String(s.campus || ""),
                    }))
                : [],
            }))
          : [];
        const rb = { ...routesByBus, [opts.busId]: blocks.sort((a, b) => a.order - b.order) };
        setRoutesByBus(rb);
        setRouteIds((prev) => ({ ...prev, [opts.busId]: String((data as any)?.id || "") }));
        recalcBusStats(rb);
        setDirty(false);
        return;
      }
      setRoutesByBus((prev) => ({ ...prev, [opts.busId]: prev[opts.busId] || [] }));
      setDirty(false);
    } catch {
      setRoutesByBus((prev) => ({ ...prev, [opts.busId]: [] }));
    }
  };

  useEffect(() => {
    fetchBuses(campus);
    fetchTimeSlots();
  }, [campus, mode]);

  useEffect(() => {
    if (!selectedBusId) return;
    if (!timeSlotId) return;
    fetchRouteDetail({ semester, busId: selectedBusId, routeType: mode, timeSlotId, weekday });
  }, [semester, selectedBusId, mode, timeSlotId, weekday]);

  const recalcBusStats = (rb: Record<number, RouteBlock[]>) => {
    const next = buses.map((b) => {
      const blocks = rb[b.id] || [];
      const count = blocks.reduce((sum, blk) => sum + blk.students.length, 0);
      const extra = blocks.reduce((sum, blk) => sum + blk.estimatedExtraTime, 0);
      const base = mode === "pickup" ? 30 : 35;
      return { ...b, assignedCount: count, estimatedTime: base + extra };
    });
    setBuses(next);
  };

  const runAutoAssign = async () => {
    try {
      if (supabaseReady) {
        const { error } = await (supabase as any).rpc("auto_assign_bus_routes", {
          p_semester: semester,
          p_campus: campus === "All" ? null : campus,
          p_route_type: mode,
          p_time_slot_id: timeSlotId,
          p_weekday: weekday,
        });
        if (error) throw error;
        if (timeSlotId) {
          await fetchRouteDetail({ semester, busId: selectedBusId, routeType: mode, timeSlotId, weekday });
        }
        setDirty(true);
        return;
      }
      const sampleStudents = Array.from({ length: 24 }, (_, i) => {
        const c = ["International", "Andover", "Platz", "Atheneum"][i % 4];
        const cls = ["K1", "K2", "J1", "J2", "S1"][i % 5];
        return { id: `stu_${i + 1}`, name: `학생${i + 1}`, className: cls, campus: c } as Student;
      });
      const byCampus: Record<string, Student[]> = {};
      sampleStudents.forEach((s) => {
        (byCampus[s.campus] ||= []).push(s);
      });
      const rb: Record<number, RouteBlock[]> = {};
      let seq = 1;
      const busIds = buses.map((b) => b.id);
      Object.keys(byCampus).forEach((camp) => {
        const group = byCampus[camp];
        const blocks: RouteBlock[] = [];
        for (let i = 0; i < group.length; i += 5) {
          const chunk = group.slice(i, i + 5);
          const label = `${camp} 블록 ${Math.floor(i / 5) + 1}`;
          const est = Math.max(2, Math.round(chunk.length * 2));
          blocks.push({ id: `blk_${seq++}`, label, order: seq, estimatedExtraTime: est, students: chunk });
        }
        blocks.forEach((blk, idx) => {
          const targetBus = busIds[(seq + idx) % busIds.length];
          (rb[targetBus] ||= []).push(blk);
        });
      });
      const normalized: Record<number, RouteBlock[]> = {};
      busIds.forEach((id) => {
        const arr = (rb[id] || []).slice().sort((a, b) => a.order - b.order);
        normalized[id] = arr;
      });
      setRoutesByBus(normalized);
      recalcBusStats(normalized);
      setDirty(true);
    } catch {}
  };

  const removeStudentFromBlock = async (blockId: string, studentId: string) => {
    if (!supabaseReady) return;
    await supabase.from("route_block_students").delete().eq("block_id", blockId).eq("student_id", studentId);
  };

  const addStudentToBlock = async (blockId: string, studentId: string) => {
    if (!supabaseReady) return;
    await supabase.from("route_block_students").insert({ block_id: blockId, student_id: studentId });
  };

  const updateBlockOrder = async (blockId: string, newOrder: number) => {
    if (!supabaseReady) return;
    await supabase.from("route_blocks").update({ block_order: newOrder }).eq("id", blockId);
  };

  const moveBlockToBus = async (blockId: string, toBusId: number) => {
    if (!supabaseReady) return;
    const toRouteId = routeIds[toBusId];
    if (!toRouteId) return;
    await supabase.from("route_blocks").update({ route_id: toRouteId }).eq("id", blockId);
  };

  const saveRouteConfirm = async (routeId: string) => {
    if (!supabaseReady) return;
    const { error } = await supabase.from("bus_routes").update({ is_confirmed: true }).eq("id", routeId);
    if (error) throw error;
  };

  const logRouteChange = async (routeId: string, action: string, payload: any) => {
    if (!supabaseReady) return;
    await supabase.from("route_change_logs").insert({ route_id: routeId, action, payload });
  };

  const handleDragStartStudent = (s: Student, fromBusId: number, fromBlockId: string, e: React.DragEvent) => {
    e.dataTransfer.setData("drag_type", "student");
    e.dataTransfer.setData("student_id", s.id);
    e.dataTransfer.setData("from_bus_id", String(fromBusId));
    e.dataTransfer.setData("from_block_id", fromBlockId);
  };

  const handleDropStudentToBlock = async (toBusId: number, toBlockId: string, e: React.DragEvent) => {
    const type = e.dataTransfer.getData("drag_type");
    if (type !== "student") return;
    const sid = e.dataTransfer.getData("student_id");
    const fromBusId = Number(e.dataTransfer.getData("from_bus_id"));
    const fromBlockId = e.dataTransfer.getData("from_block_id");
    if (!sid || !fromBusId || !fromBlockId) return;
    const rb = { ...routesByBus };
    const fromBlocks = (rb[fromBusId] || []).map((b) => ({ ...b }));
    const fromBlock = fromBlocks.find((b) => b.id === fromBlockId);
    if (!fromBlock) return;
    const student = fromBlock.students.find((s) => s.id === sid);
    if (!student) return;
    if (supabaseReady) {
      await removeStudentFromBlock(fromBlockId, sid);
      await addStudentToBlock(toBlockId, sid);
      const routeId = routeIds[fromBusId] || routeIds[toBusId] || "";
      await logRouteChange(routeId, "move_student", { studentId: sid, fromBlockId, toBlockId });
    }
    fromBlock.students = fromBlock.students.filter((s) => s.id !== sid);
    rb[fromBusId] = fromBlocks;
    const toBlocks = (rb[toBusId] || []).map((b) => ({ ...b }));
    const toBlock = toBlocks.find((b) => b.id === toBlockId);
    if (!toBlock) return;
    toBlock.students = [...toBlock.students, student];
    rb[toBusId] = toBlocks;
    setRoutesByBus(rb);
    recalcBusStats(rb);
    setDirty(true);
  };

  const handleDragStartBlock = (blockId: string, fromBusId: number, e: React.DragEvent) => {
    e.dataTransfer.setData("drag_type", "block");
    e.dataTransfer.setData("block_id", blockId);
    e.dataTransfer.setData("from_bus_id", String(fromBusId));
  };

  const handleDropBlockToBus = async (toBusId: number, e: React.DragEvent) => {
    const type = e.dataTransfer.getData("drag_type");
    if (type !== "block") return;
    const blockId = e.dataTransfer.getData("block_id");
    const fromBusId = Number(e.dataTransfer.getData("from_bus_id"));
    if (!blockId || !fromBusId) return;
    const rb = { ...routesByBus };
    const from = (rb[fromBusId] || []).slice();
    const moving = from.find((b) => b.id === blockId);
    if (!moving) return;
    if (supabaseReady) {
      await moveBlockToBus(blockId, toBusId);
      const routeId = routeIds[fromBusId] || routeIds[toBusId] || "";
      await logRouteChange(routeId, "move_block_bus", { blockId, fromBusId, toBusId });
    }
    rb[fromBusId] = from.filter((b) => b.id !== blockId);
    const to = (rb[toBusId] || []).slice();
    to.push(moving);
    rb[toBusId] = to;
    setRoutesByBus(rb);
    recalcBusStats(rb);
    setDirty(true);
  };

  const handleDropBlockBefore = async (toBusId: number, beforeBlockId: string, e: React.DragEvent) => {
    const type = e.dataTransfer.getData("drag_type");
    if (type !== "block") return;
    const blockId = e.dataTransfer.getData("block_id");
    const fromBusId = Number(e.dataTransfer.getData("from_bus_id"));
    if (!blockId || !fromBusId) return;
    const rb = { ...routesByBus };
    const from = (rb[fromBusId] || []).slice();
    const moving = from.find((b) => b.id === blockId);
    if (!moving) return;
    rb[fromBusId] = from.filter((b) => b.id !== blockId);
    const to = (rb[toBusId] || []).slice();
    const idx = to.findIndex((b) => b.id === beforeBlockId);
    const next = [...to];
    const insertIndex = Math.max(0, idx);
    next.splice(insertIndex, 0, moving);
    rb[toBusId] = next;
    if (supabaseReady) {
      await updateBlockOrder(blockId, insertIndex + 1);
      const routeId = routeIds[toBusId] || "";
      await logRouteChange(routeId, "reorder_block", { blockId, toBusId, order: insertIndex + 1 });
    }
    setRoutesByBus(rb);
    recalcBusStats(rb);
    setDirty(true);
  };

  const anyCapacityExceeded = useMemo(() => {
    return buses.some((b) => b.assignedCount > b.capacity);
  }, [buses]);

  const anyTimeExceeded = useMemo(() => {
    return buses.some((b) => b.estimatedTime > 60);
  }, [buses]);

  const colorForBusStatus = (b: Bus) => {
    if (b.assignedCount > b.capacity) return "border-red-200 bg-red-50";
    if (b.estimatedTime > 60) return "border-amber-200 bg-amber-50";
    return "border-emerald-200 bg-emerald-50";
  };

  const saveRoutes = async () => {
    if (!dirty || anyCapacityExceeded) return;
    setSaving(true);
    try {
      const routeId = routeIds[selectedBusId];
      if (routeId) await saveRouteConfirm(routeId);
    } catch {} finally {
      setSaving(false);
      setDirty(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bus className="w-6 h-6 text-frage-yellow" />
          <h1 className="text-2xl font-black text-slate-900">운영용 차량 관리</h1>
          {dirty && <span className="ml-2 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">변경 사항 있음</span>}
        </div>
        <div className="flex items-center gap-2">
          <select value={semester} onChange={(e) => setSemester(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
            {["2026-1","2026-2","2027-1","2027-2"].map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
          <select value={campus} onChange={(e) => setCampus(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
            {["All","International","Andover","Platz","Atheneum"].map(c => (<option key={c} value={c}>{c === "All" ? "전체" : c}</option>))}
          </select>
          <div className="flex gap-1">
            {["pickup","dropoff"].map(m => (
              <button
                key={m}
                onClick={() => setMode(m as "pickup" | "dropoff")}
                className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${mode === m ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`}
              >
                {m === "pickup" ? "등원" : "하원"}
              </button>
            ))}
          </div>
          <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
            {[1,2,3,4,5].map(w => (<option key={w} value={w}>{["월","화","수","목","금"][w-1]}</option>))}
          </select>
          <select value={timeSlotId ?? ""} onChange={(e) => setTimeSlotId(e.target.value || null)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
            {(timeSlots.length === 0 ? [{ id: "", label: "시간 슬롯 없음", base_time: "" }] : timeSlots).map(ts => (
              <option key={ts.id} value={ts.id}>{ts.label}</option>
            ))}
          </select>
          <button
            onClick={runAutoAssign}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold bg-white"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            AI 자동 배치
          </button>
          <button
            onClick={saveRoutes}
            disabled={!dirty || saving || anyCapacityExceeded}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${!dirty || saving || anyCapacityExceeded ? "bg-slate-200 text-slate-500" : "bg-frage-navy text-white"}`}
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <aside className="md:col-span-3 space-y-3">
          {buses.map(b => {
            const status = colorForBusStatus(b);
            const timeColor = b.estimatedTime > 60 ? "text-amber-600" : "text-slate-500";
            const capColor = b.assignedCount > b.capacity ? "text-red-600" : "text-slate-500";
            return (
              <div
                key={b.id}
                onClick={() => setSelectedBusId(b.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropBlockToBus(b.id, e)}
                className={`border rounded-xl p-4 cursor-pointer ${status} ${selectedBusId === b.id ? "ring-2 ring-slate-400" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900">{b.name}</div>
                  <div className="text-xs font-bold text-slate-500">{mode === "pickup" ? "등원" : "하원"}</div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className={`font-bold ${capColor}`}>정원 {b.capacity} / 현재 {b.assignedCount}</div>
                  <div className={`flex items-center gap-1 ${timeColor}`}>
                    <Clock className="w-3.5 h-3.5" />
                    예상 {b.estimatedTime}분
                  </div>
                </div>
              </div>
            );
          })}
          <div className="text-xs text-slate-500">
            초록 정상, 노랑 시간 초과, 빨강 정원 초과
          </div>
        </aside>

        <section className="md:col-span-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="text-lg font-bold text-slate-900">{buses.find(b => b.id === selectedBusId)?.name}</div>
              <div className="text-xs font-bold text-slate-500">정류 블록 및 학생</div>
            </div>
            <div className="p-4 space-y-4">
              {(routesByBus[selectedBusId] || []).map((blk) => {
                const count = blk.students.length;
                const selectedTimeSlot = timeSlots.find(t => t.id === timeSlotId || "");
                return (
                  <div
                    key={blk.id}
                    draggable
                    onDragStart={(e) => handleDragStartBlock(blk.id, selectedBusId, e)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropBlockBefore(selectedBusId, blk.id, e)}
                    className="rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                      <div className="text-sm font-bold text-slate-900">
                        [{selectedTimeSlot?.base_time || ""}] {blk.label}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <div className="flex items-center gap-1">
                          ⏱ +{blk.estimatedExtraTime}분
                        </div>
                        <div className="flex items-center gap-1">
                          👥 {count}명
                        </div>
                      </div>
                    </div>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropStudentToBlock(selectedBusId, blk.id, e)}
                      className="p-3 flex flex-wrap gap-2"
                    >
                      {blk.students.map(s => {
                        const sibling = s.flags?.sibling;
                        const timeSensitive = s.flags?.timeSensitive;
                        const warn = s.flags?.warning;
                        const border = sibling ? "border-violet-500" : "border-slate-200";
                        const ring = warn ? "ring-2 ring-red-300" : timeSensitive ? "ring-2 ring-amber-300" : "";
                        return (
                          <div
                            key={s.id}
                            draggable
                            onDragStart={(e) => handleDragStartStudent(s, selectedBusId, blk.id, e)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-white shadow-sm cursor-grab active:cursor-grabbing ${border} ${ring}`}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{s.name}</span>
                              <span className="text-xs text-slate-500">{s.className} · {s.campus}</span>
                            </div>
                            {timeSensitive && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                            {warn && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {(routesByBus[selectedBusId] || []).length === 0 && (
                <div className="text-sm text-slate-500">AI 자동 배치로 블록을 생성하세요.</div>
              )}
            </div>
          </div>
        </section>

        <aside className="md:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900">지도 미리보기</div>
              <div className="text-xs text-slate-500 mt-1">추후 연결</div>
              {anyCapacityExceeded && (
                <div className="mt-4 text-xs font-bold text-red-600">정원 초과로 저장 불가</div>
              )}
              {anyTimeExceeded && !anyCapacityExceeded && (
                <div className="mt-4 text-xs font-bold text-amber-600">시간 초과 예상</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
