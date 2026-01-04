"use client";

import { useEffect, useMemo, useState } from "react";
import { Bus, Clock, AlertTriangle, Save, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  const [buses, setBuses] = useState<Bus[]>(() =>
    Array.from({ length: 6 }, (_, i) => {
      const id = i + 2;
      return { id, name: `${id}호차`, capacity: 12, assignedCount: 0, estimatedTime: 0 };
    })
  );
  const [routesByBus, setRoutesByBus] = useState<Record<number, RouteBlock[]>>({});
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  useEffect(() => {
    const init = async () => {
      const demo: Student[] = Array.from({ length: 36 }, (_, i) => {
        const campus = ["International", "Andover", "Platz", "Atheneum"][i % 4];
        const cls = ["K1", "K2", "J1", "J2", "S1"][i % 5];
        const flags = {
          sibling: i % 11 === 0,
          timeSensitive: i % 7 === 0,
          warning: i % 13 === 0,
        };
        return { id: `stu_${i + 1}`, name: `학생${i + 1}`, className: cls, campus, flags };
      });
      setAllStudents(demo);
      setRoutesByBus({});
      setDirty(false);
    };
    init();
  }, []);

  const visibleStudents = useMemo(() => {
    return allStudents.filter(s => (campus === "All" ? true : s.campus === campus));
  }, [allStudents, campus]);

  const recalcBusStats = (rb: Record<number, RouteBlock[]>) => {
    const next = buses.map(b => {
      const blocks = rb[b.id] || [];
      const count = blocks.reduce((sum, blk) => sum + blk.students.length, 0);
      const extra = blocks.reduce((sum, blk) => sum + blk.estimatedExtraTime, 0);
      const base = mode === "pickup" ? 30 : 35;
      return { ...b, assignedCount: count, estimatedTime: base + extra };
    });
    setBuses(next);
  };

  const aiAutoAssign = async () => {
    const base = visibleStudents.slice();
    const byCampus: Record<string, Student[]> = {};
    base.forEach(s => {
      const k = s.campus || "Unknown";
      (byCampus[k] ||= []).push(s);
    });
    const rb: Record<number, RouteBlock[]> = {};
    let seq = 1;
    const busIds = buses.map(b => b.id);
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
    busIds.forEach(id => {
      const arr = (rb[id] || []).slice().sort((a, b) => a.order - b.order);
      normalized[id] = arr;
    });
    setRoutesByBus(normalized);
    recalcBusStats(normalized);
    setDirty(true);
  };

  const handleDragStartStudent = (s: Student, fromBusId: number, fromBlockId: string, e: React.DragEvent) => {
    e.dataTransfer.setData("drag_type", "student");
    e.dataTransfer.setData("student_id", s.id);
    e.dataTransfer.setData("from_bus_id", String(fromBusId));
    e.dataTransfer.setData("from_block_id", fromBlockId);
  };

  const handleDropStudentToBlock = (toBusId: number, toBlockId: string, e: React.DragEvent) => {
    const type = e.dataTransfer.getData("drag_type");
    if (type !== "student") return;
    const sid = e.dataTransfer.getData("student_id");
    const fromBusId = Number(e.dataTransfer.getData("from_bus_id"));
    const fromBlockId = e.dataTransfer.getData("from_block_id");
    if (!sid || !fromBusId || !fromBlockId) return;
    const rb = { ...routesByBus };
    const fromBlocks = (rb[fromBusId] || []).map(b => ({ ...b }));
    const fromBlock = fromBlocks.find(b => b.id === fromBlockId);
    if (!fromBlock) return;
    const student = fromBlock.students.find(s => s.id === sid);
    if (!student) return;
    fromBlock.students = fromBlock.students.filter(s => s.id !== sid);
    rb[fromBusId] = fromBlocks;
    const toBlocks = (rb[toBusId] || []).map(b => ({ ...b }));
    const toBlock = toBlocks.find(b => b.id === toBlockId);
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

  const handleDropBlockToBus = (toBusId: number, e: React.DragEvent) => {
    const type = e.dataTransfer.getData("drag_type");
    if (type !== "block") return;
    const blockId = e.dataTransfer.getData("block_id");
    const fromBusId = Number(e.dataTransfer.getData("from_bus_id"));
    if (!blockId || !fromBusId) return;
    const rb = { ...routesByBus };
    const from = (rb[fromBusId] || []).slice();
    const moving = from.find(b => b.id === blockId);
    if (!moving) return;
    rb[fromBusId] = from.filter(b => b.id !== blockId);
    const to = (rb[toBusId] || []).slice();
    to.push(moving);
    rb[toBusId] = to;
    setRoutesByBus(rb);
    recalcBusStats(rb);
    setDirty(true);
  };

  const handleDropBlockBefore = (toBusId: number, beforeBlockId: string, e: React.DragEvent) => {
    const type = e.dataTransfer.getData("drag_type");
    if (type !== "block") return;
    const blockId = e.dataTransfer.getData("block_id");
    const fromBusId = Number(e.dataTransfer.getData("from_bus_id"));
    if (!blockId || !fromBusId) return;
    const rb = { ...routesByBus };
    const from = (rb[fromBusId] || []).slice();
    const moving = from.find(b => b.id === blockId);
    if (!moving) return;
    rb[fromBusId] = from.filter(b => b.id !== blockId);
    const to = (rb[toBusId] || []).slice();
    const idx = to.findIndex(b => b.id === beforeBlockId);
    const next = [...to];
    next.splice(Math.max(0, idx), 0, moving);
    rb[toBusId] = next;
    setRoutesByBus(rb);
    recalcBusStats(rb);
    setDirty(true);
  };

  const anyCapacityExceeded = useMemo(() => {
    return buses.some(b => b.assignedCount > b.capacity);
  }, [buses]);

  const anyTimeExceeded = useMemo(() => {
    return buses.some(b => b.estimatedTime > 60);
  }, [buses]);

  const colorForBusStatus = (b: Bus) => {
    if (b.assignedCount > b.capacity) return "border-red-200 bg-red-50";
    if (b.estimatedTime > 60) return "border-amber-200 bg-amber-50";
    return "border-emerald-200 bg-emerald-50";
  };

  const saveRoutes = async () => {
    if (!dirty || anyCapacityExceeded) return;
    setSaving(true);
    const payload = {
      semester,
      campus,
      mode,
      routes: routesByBus,
      buses,
      saved_at: new Date().toISOString(),
    };
    await supabase.from("transport_routes").insert(payload as any);
    setSaving(false);
    setDirty(false);
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
          <button
            onClick={aiAutoAssign}
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
                        {mode === "pickup" ? "[07:50]" : "[16:30]"} {blk.label}
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

