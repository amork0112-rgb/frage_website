use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bus, Clock, AlertTriangle, Save, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  eventTime?: string;
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
  const [opType, setOpType] = useState<"regular" | "special" | "vacation">("regular");
  const [specialDate, setSpecialDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [dirty, setDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedBusId, setSelectedBusId] = useState<number>(2);
  const [weekday, setWeekday] = useState<number>(2);
  const [timeSlotId, setTimeSlotId] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routesByBus, setRoutesByBus] = useState<Record<number, RouteBlock[]>>({});
  type RouteKey = `${number}_${number}_${string}`;
  const makeRouteKey = useCallback((busId: number, w: number, ts: string | null): RouteKey => `${busId}_${w}_${ts ?? ""}`, []);
  const [routeIds, setRouteIds] = useState<Record<RouteKey, string>>({});

  const getMyRole = async (): Promise<"admin" | "teacher" | "parent"> => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) throw new Error("unauthenticated");
    
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (profile) return "admin";
    
    const { data: teacher } = await supabase.from("teachers").select("role").eq("auth_user_id", user.id).maybeSingle();
    if (teacher) return "teacher";
    
    return "parent";
  };

  useEffect(() => {
    (async () => {
      try {
        const role = await getMyRole();
        if (role === "parent") {
          router.replace("/portal");
        }
      } catch (e) {
        console.error("Error in useEffect for role check:", e);
      }
    })();
  }, [router]);

  const fetchTimeSlots = useCallback(async () => {
    try {
      if (opType !== "regular") {
        setTimeSlots([]);
        setTimeSlotId(null);
        return;
      }
      if (campus === "All") {
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
  }, [opType, campus, mode]);

  const fetchBuses = async (campusVal: string) => {
    try {
        if (campusVal !== "All") {
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

  const recalcBusStats = useCallback((rb: Record<number, RouteBlock[]>) => {
    setBuses((prev) =>
      prev.map((b) => {
        const blocks = rb[b.id] || [];
        const count = blocks.reduce((sum, blk) => sum + blk.students.length, 0);
        const extra = blocks.reduce((sum, blk) => sum + blk.estimatedExtraTime, 0);
        const base = mode === "pickup" ? 30 : 35;
        return { ...b, assignedCount: count, estimatedTime: base + extra };
      })
    );
  }, [mode]);

  const fetchRouteDetail = useCallback(async (opts: { semester: string; busId: number; routeType: "pickup" | "dropoff"; timeSlotId: string | null; weekday: number }) => {
    try {
      setRoutesByBus((prev) => ({ ...prev, [opts.busId]: [] }));
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
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setRoutesByBus((prev) => ({ ...prev, [opts.busId]: [] }));
          setRouteIds((prev) => ({ ...prev, [makeRouteKey(opts.busId, opts.weekday, opts.timeSlotId)]: "" }));
          setDirty(false);
          return;
        }
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
        setRouteIds((prev) => ({ ...prev, [makeRouteKey(opts.busId, opts.weekday, opts.timeSlotId)]: String((data as any)?.id || "") }));
        recalcBusStats(rb);
        setDirty(false);
        return;
      setRoutesByBus((prev) => ({ ...prev, [opts.busId]: prev[opts.busId] || [] }));
      setDirty(false);
    } catch {
      setRoutesByBus((prev) => ({ ...prev, [opts.busId]: [] }));
    }
  }, [makeRouteKey, routesByBus, recalcBusStats]);

  useEffect(() => {
    fetchBuses(campus);
    fetchTimeSlots();
  }, [campus, mode, opType, fetchTimeSlots]);

  useEffect(() => {
    if (!selectedBusId) return;
    if (!timeSlotId) return;
    fetchRouteDetail({ semester, busId: selectedBusId, routeType: mode, timeSlotId, weekday });
  }, [semester, selectedBusId, mode, timeSlotId, weekday, fetchRouteDetail]);


  const fetchEligibleStudents = async (): Promise<Student[]> => {
    try {
      if (opType === "regular") {
        if (campus === "All" || !timeSlotId) return [];
        const { data } = await supabase
          .from("students")
          .select("id,name,class_name,campus,status,schedule,pickup_type,dropoff_type")
          .eq("status", "재원")
          .eq("campus", campus);
        const list = Array.isArray(data) ? data : [];
        const filtered = list
          .filter((s: any) => {
            const sch = s?.schedule || {};
            if (!(sch?.weekday === weekday && sch?.time_slot_id === timeSlotId)) return false;
            const isBusPickup = String(s?.pickup_type || "self") === "bus";
            const isBusDropoff = String(s?.dropoff_type || "self") === "bus";
            return mode === "pickup" ? isBusPickup : isBusDropoff;
          })
          .map((s: any) => ({
            id: String(s.id),
            name: String(s.name || ""),
            className: String(s.class_name || ""),
            campus: String(s.campus || ""),
          }));
        return filtered;
      } else {
        const { data: evs } = await supabase
          .from("student_transport_events")
          .select("student_id,date,event_time,route_type,is_active")
          .eq("date", specialDate)
          .eq("route_type", mode)
          .eq("is_active", true);
        const events = Array.isArray(evs) ? evs : [];
        if (events.length === 0) return [];
        const ids = events.map((e: any) => e.student_id).filter(Boolean);
        if (ids.length === 0) return [];
        let stuQuery = supabase
          .from("students")
          .select("id,name,class_name,campus")
          .in("id", ids);
        if (campus !== "All") {
          stuQuery = stuQuery.eq("campus", campus);
        }
        const { data: studs } = await stuQuery;
        const stuMap = new Map<string, any>();
        (Array.isArray(studs) ? studs : []).forEach((s: any) => {
          stuMap.set(String(s.id), s);
        });
        const merged: Student[] = events
          .map((e: any) => {
            const s = stuMap.get(String(e.student_id));
            if (!s) return null;
            return {
              id: String(s.id),
              name: String(s.name || ""),
              className: String(s.class_name || ""),
              campus: String(s.campus || ""),
              eventTime: String(e.event_time || ""),
            } as Student;
          })
          .filter(Boolean) as Student[];
        return merged;
      }
    } catch {
      return [];
    }
  };

  const runAutoAssign = async () => {
    try {
      const eligible = await fetchEligibleStudents();
      if (eligible.length === 0) return;
      if (opType === "regular") {
        if (!timeSlotId) return;
        const { error } = await (supabase as any).rpc("auto_assign_bus_routes", {
            p_semester: semester,
            p_campus: campus === "All" ? null : campus,
            p_route_type: mode,
            p_time_slot_id: timeSlotId,
            p_weekday: weekday,
          });
          if (error) throw error;
          await fetchRouteDetail({ semester, busId: selectedBusId, routeType: mode, timeSlotId, weekday });
          setDirty(true);
      } else { // opType is "special" | "vacation"
        const byKey: Record<string, Student[]> = {};
        eligible.forEach((s) => {
          const key = `${s.campus}|${s.eventTime || ""}`;
          (byKey[key] ||= []).push(s);
        });
        const rb: Record<number, RouteBlock[]> = {};
        let seq = 1;
        const busIds = buses.map((b) => b.id);
        Object.keys(byKey).forEach((key) => {
          const [camp, time] = key.split("|");
          const group = byKey[key];
          const blocks: RouteBlock[] = [];
          for (let i = 0; i < group.length; i += 5) {
            const chunk = group.slice(i, i + 5);
            let label;
            if (opType === "special") {
              label = `[${time}] ${camp} 특강 ${mode === "pickup" ? "등원" : "하원"}`;
            } else { // opType must be "vacation"
              label = `[${time}] ${camp} 방학 ${mode === "pickup" ? "등원" : "하원"}`;
            }
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
    }
    }
    catch {}
  };

  const removeStudentFromBlock = async (blockId: string, studentId: string) => {
    await supabase.from("route_block_students").delete().eq("block_id", blockId).eq("student_id", studentId);
  };

  const addStudentToBlock = async (blockId: string, studentId: string) => {
    await supabase.from("route_block_students").insert({ block_id: blockId, student_id: studentId });
  };

  const updateBlockOrder = async (blockId: string, newOrder: number) => {
    await supabase.from("route_blocks").update({ block_order: newOrder }).eq("id", blockId);
  };

  const moveBlockToBus = async (blockId: string, toBusId: number) => {
    const toRouteId = routeIds[makeRouteKey(toBusId, weekday, timeSlotId)];
    if (!toRouteId) return;
    await supabase.from("route_blocks").update({ route_id: toRouteId }).eq("id", blockId);
  };

  const saveRouteConfirm = async (routeId: string) => {
    const { error } = await supabase.from("bus_routes").update({ is_confirmed: true }).eq("id", routeId);
    if (error) throw error;
  };

  const logRouteChange = async (routeId: string, action: string, payload: any) => {
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
    await removeStudentFromBlock(fromBlockId, sid);
      await addStudentToBlock(toBlockId, sid);
      const routeId =
        routeIds[makeRouteKey(fromBusId, weekday, timeSlotId)] ||
        routeIds[makeRouteKey(toBusId, weekday, timeSlotId)] ||
        "";
      await logRouteChange(routeId, "move_student", { studentId: sid, fromBlockId, toBlockId });
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
    await moveBlockToBus(blockId, toBusId);
      const routeId =
        routeIds[makeRouteKey(fromBusId, weekday, timeSlotId)] ||
        routeIds[makeRouteKey(toBusId, weekday, timeSlotId)] ||
        "";
      await logRouteChange(routeId, "move_block_bus", { blockId, fromBusId, toBusId });
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
    await updateBlockOrder(blockId, insertIndex + 1);
      const routeId = routeIds[makeRouteKey(toBusId, weekday, timeSlotId)] || "";
      await logRouteChange(routeId, "reorder_block", { blockId, toBusId, order: insertIndex + 1 });
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
      const routeId = routeIds[makeRouteKey(selectedBusId, weekday, timeSlotId)];
      if (routeId) await saveRouteConfirm(routeId);
    } catch (e) {
      console.error("Failed to save routes:", e);
    } finally {
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
          {/* Content that was likely truncated */}
        </div>
      </div>
    </main>
  );
}
