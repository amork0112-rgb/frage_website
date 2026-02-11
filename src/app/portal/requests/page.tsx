"use client";

import { useEffect, useMemo, useState } from "react";
import PortalHeader from "@/components/PortalHeader";
import { Calendar, Clock, Bus, Pill, Send, History } from "lucide-react";
import { supabase, supabaseReady } from "@/lib/supabase";

type RequestType = "absence" | "early_pickup" | "bus_change" | "medication";

export default function RequestsPage() {
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedText, setSubmittedText] = useState<string>("");
  const [recentRequests, setRecentRequests] = useState<{ date: string; type: RequestType; studentName?: string }[]>([]);
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId) || children[0] || { id: "", name: "자녀" },
    [children, selectedChildId]
  );

  useEffect(() => {
    (async () => {
      if (!supabaseReady) return;
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          setChildren([]);
          setSelectedChildId("");
          return;
        }

        const { data: parent } = await supabase
          .from("parents")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!parent?.id) {
          setChildren([]);
          setSelectedChildId("");
          return;
        }

        const { data: rows } = await supabase
          .from("students")
          .select("id,student_name")
          .eq("parent_id", parent.id);

        const students = Array.isArray(rows) ? rows : [];
        const list =
          students.length > 0
            ? students.map((s: any) => ({
                id: String(s.id),
                name: String(s.student_name || "자녀"),
              }))
            : [];

        setChildren(list);
        setSelectedChildId(list[0]?.id ?? "");
      } catch {
        setChildren([]);
        setSelectedChildId("");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedChildId) return;
      try {
        const res = await fetch(`/api/portal/requests?studentId=${selectedChildId}`, { cache: "no-store" });
        if (!res.ok) return;
        const payload = await res.json().catch(() => ({}));
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const recent = items.map((it: any) => {
          const rawType = String(it.type || "absence");
          const mappedType = rawType === "pickup" ? "early_pickup" : rawType;
          // API 변경 반영: date_start 우선 사용, 없으면 created_at
          const displayDate = it.date_start || it.created_at || "";
          return {
            date: String(displayDate),
            type: mappedType as RequestType,
            // 필요 시 student_name 등 추가 사용 가능
            studentName: it.student_name,
          };
        });
        setRecentRequests(recent);
      } catch {}
    })();
  }, [selectedChildId]);

  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().split("T")[0]);
  const [absenceEndDate, setAbsenceEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [absenceReason, setAbsenceReason] = useState("");
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split("T")[0]);
  const [pickupTime, setPickupTime] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [busDate, setBusDate] = useState(new Date().toISOString().split("T")[0]);
  const [busChangeType, setBusChangeType] = useState<"no_bus" | "pickup_change" | "dropoff_change">("no_bus");
  const [busNote, setBusNote] = useState("");
  const [medStart, setMedStart] = useState(new Date().toISOString().split("T")[0]);
  const [medEnd, setMedEnd] = useState(new Date().toISOString().split("T")[0]);
  const [medName, setMedName] = useState("");
  const [medInstructions, setMedInstructions] = useState("");

  const formatRecentLabel = (dateStr: string, type: RequestType) => {
    const d = new Date(dateStr);
    const formatted = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(d);
    const typeLabel = type === "absence" ? "결석" : type === "early_pickup" ? "조기하원" : type === "bus_change" ? "차량 변경" : "투약";
    return `${formatted} • ${typeLabel} • 제출됨`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) {
      setSubmittedText("요청 유형을 먼저 선택해 주세요.");
      return;
    }
    if (!selectedChildId) {
      setSubmittedText("자녀를 먼저 선택해 주세요.");
      return;
    }
    setLoading(true);
    const typeForDb = selectedType;
    const payload =
      selectedType === "medication"
        ? { dateStart: medStart, dateEnd: medEnd, note: medInstructions, medName }
        : selectedType === "bus_change"
        ? { dateStart: busDate, note: busNote, changeType: busChangeType }
        : selectedType === "early_pickup"
        ? { dateStart: pickupDate, time: pickupTime, note: pickupNote }
        : { dateStart: absenceDate, dateEnd: absenceEndDate || absenceDate, note: absenceReason };
    try {
      const res = await fetch("/api/portal/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedChildId,
          type: typeForDb,
          payload,
        }),
      });
      if (!res.ok) {
        setSubmittedText("요청 전달에 실패했습니다. 다시 시도해 주세요.");
      } else {
        setSubmittedText("요청이 제출되었습니다. 학원에 전달되었습니다.");
        const dateForRecent =
          selectedType === "medication"
            ? medStart
            : selectedType === "bus_change"
            ? busDate
            : selectedType === "early_pickup"
            ? pickupDate
            : absenceDate;
        setRecentRequests((prev) => {
          const next = [{ date: dateForRecent, type: selectedType }, ...prev];
          return next.slice(0, 5);
        });
      }
    } catch {
      setSubmittedText("요청 전달에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const clearSubmission = () => setSubmittedText("");

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      <main className="px-4 md:px-6 py-6 max-w-6xl mx-auto space-y-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Menu & Child Selector */}
            <div className="lg:col-span-4 space-y-6">
                <section>
                  <h1 className="text-2xl font-bold text-slate-800">요청 전달</h1>
                  <p className="text-slate-500 text-sm mt-1">결석, 조기하원, 차량 변경, 투약 요청을 학원에 전달할 수 있습니다.</p>
                </section>

                <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">자녀</span>
                    <select
                      value={selectedChildId}
                      onChange={(e) => setSelectedChildId(e.target.value)}
                      className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    >
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      {children.length === 0 && <option value="">자녀</option>}
                    </select>
                  </div>
                </section>

                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                  <button
                    onClick={() => {
                      setSelectedType("absence");
                      clearSubmission();
                    }}
                    className={`flex lg:flex-row flex-col items-center lg:justify-start justify-center rounded-2xl border p-5 gap-3 transition-all ${
                      selectedType === "absence"
                        ? "bg-frage-blue text-white border-frage-blue shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${selectedType === "absence" ? "bg-white/20" : "bg-slate-100"}`}>
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm font-bold">결석</span>
                        <span className={`text-xs ${selectedType === "absence" ? "text-white/80" : "text-slate-400"} hidden lg:block`}>질병, 경조사 등 결석 사유</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedType("early_pickup");
                      clearSubmission();
                    }}
                    className={`flex lg:flex-row flex-col items-center lg:justify-start justify-center rounded-2xl border p-5 gap-3 transition-all ${
                      selectedType === "early_pickup"
                        ? "bg-frage-green text-white border-frage-green shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${selectedType === "early_pickup" ? "bg-white/20" : "bg-slate-100"}`}>
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm font-bold">조기하원</span>
                        <span className={`text-xs ${selectedType === "early_pickup" ? "text-white/80" : "text-slate-400"} hidden lg:block`}>정규 시간보다 일찍 하원</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedType("bus_change");
                      clearSubmission();
                    }}
                    className={`flex lg:flex-row flex-col items-center lg:justify-start justify-center rounded-2xl border p-5 gap-3 transition-all ${
                      selectedType === "bus_change"
                        ? "bg-frage-yellow text-frage-navy border-frage-yellow shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${selectedType === "bus_change" ? "bg-white/20" : "bg-slate-100"}`}>
                        <Bus className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm font-bold">차량 변경</span>
                        <span className={`text-xs ${selectedType === "bus_change" ? "text-frage-navy/80" : "text-slate-400"} hidden lg:block`}>탑승 장소/시간 변경</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedType("medication");
                      clearSubmission();
                    }}
                    className={`flex lg:flex-row flex-col items-center lg:justify-start justify-center rounded-2xl border p-5 gap-3 transition-all ${
                      selectedType === "medication"
                        ? "bg-frage-navy text-white border-frage-navy shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${selectedType === "medication" ? "bg-white/20" : "bg-slate-100"}`}>
                        <Pill className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm font-bold">투약</span>
                        <span className={`text-xs ${selectedType === "medication" ? "text-white/80" : "text-slate-400"} hidden lg:block`}>약 복용 의뢰</span>
                    </div>
                  </button>
                </div>

                {/* Recent Requests for Desktop (Moved here) */}
                <section className="hidden lg:block bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" /> 최근 요청
                  </h3>
                  <div className="space-y-3">
                    {recentRequests.slice(0, 5).map((r, idx) => (
                      <div key={`${r.date}-${r.type}-${idx}`} className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="font-bold mb-1">{formatRecentLabel(r.date, r.type).split(" • ")[0]}</div>
                         <div className="flex justify-between">
                            <span>{formatRecentLabel(r.date, r.type).split(" • ")[1]}</span>
                            <span className="text-slate-400">제출됨</span>
                         </div>
                        {r.studentName && (
                          <div className="text-slate-400 mt-1 pt-1 border-t border-slate-100">· {r.studentName}</div>
                        )}
                      </div>
                    ))}
                    {recentRequests.length === 0 && (
                        <div className="text-xs text-slate-400 text-center py-4">최근 요청 내역이 없습니다.</div>
                    )}
                  </div>
                </section>
            </div>

            {/* Right Column: Active Form */}
            <div className="lg:col-span-8 space-y-6">
                <section className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-sm min-h-[400px]">
                  {selectedType === null && (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                            <Send className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm">좌측 메뉴에서 요청 유형을 선택해 주세요.</p>
                    </div>
                  )}

                  {selectedType === "absence" && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-frage-blue" />
                            결석 알림 제출
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">시작 날짜</label>
                                <input
                                  type="date"
                                  required
                                  value={absenceDate}
                                  onChange={(e) => setAbsenceDate(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-blue bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">끝나는 날짜</label>
                                <input
                                  type="date"
                                  value={absenceEndDate}
                                  min={absenceDate}
                                  onChange={(e) => setAbsenceEndDate(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-blue bg-white"
                                />
                              </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">사유 (선택)</label>
                            <input
                              type="text"
                              value={absenceReason}
                              onChange={(e) => setAbsenceReason(e.target.value)}
                              placeholder="간단한 설명 (예: 감기 몸살)"
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-blue bg-white"
                            />
                          </div>
                          <div className="pt-4">
                              <button
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-8 bg-frage-blue text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                              >
                                {loading ? "제출 중..." : <><Send className="w-5 h-5" /> 요청 제출하기</>}
                              </button>
                          </div>
                        </form>
                    </div>
                  )}

                  {selectedType === "early_pickup" && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-frage-green" />
                            조기하원 알림 제출
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">날짜</label>
                                <input
                                  type="date"
                                  required
                                  value={pickupDate}
                                  onChange={(e) => setPickupDate(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-green bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">하원 시간</label>
                                <input
                                  type="time"
                                  required
                                  value={pickupTime}
                                  onChange={(e) => setPickupTime(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-green bg-white"
                                />
                              </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">메모 (선택)</label>
                            <input
                              type="text"
                              value={pickupNote}
                              onChange={(e) => setPickupNote(e.target.value)}
                              placeholder="간단한 설명 (예: 치과 예약)"
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-green bg-white"
                            />
                          </div>
                          <div className="pt-4">
                              <button
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-8 bg-frage-green text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
                              >
                                {loading ? "제출 중..." : <><Send className="w-5 h-5" /> 요청 제출하기</>}
                              </button>
                          </div>
                        </form>
                    </div>
                  )}

                  {selectedType === "bus_change" && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Bus className="w-5 h-5 text-frage-yellow" />
                            차량 변경 요청 제출
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">날짜</label>
                            <input
                              type="date"
                              required
                              value={busDate}
                              onChange={(e) => setBusDate(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-yellow bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">변경 유형</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <button
                                type="button"
                                onClick={() => setBusChangeType("no_bus")}
                                className={`px-4 py-3 rounded-lg border text-sm font-bold transition-all ${
                                  busChangeType === "no_bus"
                                    ? "bg-yellow-50 border-frage-yellow text-frage-navy ring-1 ring-frage-yellow"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                오늘 버스 미이용
                              </button>
                              <button
                                type="button"
                                onClick={() => setBusChangeType("pickup_change")}
                                className={`px-4 py-3 rounded-lg border text-sm font-bold transition-all ${
                                  busChangeType === "pickup_change"
                                    ? "bg-yellow-50 border-frage-yellow text-frage-navy ring-1 ring-frage-yellow"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                등원 버스 변경
                              </button>
                              <button
                                type="button"
                                onClick={() => setBusChangeType("dropoff_change")}
                                className={`px-4 py-3 rounded-lg border text-sm font-bold transition-all ${
                                  busChangeType === "dropoff_change"
                                    ? "bg-yellow-50 border-frage-yellow text-frage-navy ring-1 ring-frage-yellow"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                하원 버스 변경
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">메모 (선택)</label>
                            <input
                              type="text"
                              value={busNote}
                              onChange={(e) => setBusNote(e.target.value)}
                              placeholder="간단한 설명 (예: 할머니댁 하원)"
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-yellow bg-white"
                            />
                          </div>
                          <div className="pt-4">
                              <button
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-8 bg-frage-yellow text-frage-navy py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors"
                              >
                                {loading ? "제출 중..." : <><Send className="w-5 h-5" /> 요청 제출하기</>}
                              </button>
                          </div>
                        </form>
                    </div>
                  )}

                  {selectedType === "medication" && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Pill className="w-5 h-5 text-frage-navy" />
                            투약 의뢰 제출
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">시작 날짜</label>
                              <input
                                type="date"
                                required
                                value={medStart}
                                onChange={(e) => setMedStart(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-navy bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">종료 날짜</label>
                              <input
                                type="date"
                                required
                                min={medStart}
                                value={medEnd}
                                onChange={(e) => setMedEnd(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-navy bg-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">약 이름</label>
                            <input
                              type="text"
                              required
                              value={medName}
                              onChange={(e) => setMedName(e.target.value)}
                              placeholder="약 이름"
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-navy bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">투약 지시사항</label>
                            <textarea
                              required
                              value={medInstructions}
                              onChange={(e) => setMedInstructions(e.target.value)}
                              placeholder="예: 점심 식후 30분, 가루약과 물약을 섞어서 주세요."
                              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-navy bg-white h-24 resize-none"
                            />
                          </div>
                          <div className="pt-4">
                              <button
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-8 bg-frage-navy text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                              >
                                {loading ? "제출 중..." : <><Send className="w-5 h-5" /> 요청 제출하기</>}
                              </button>
                          </div>
                        </form>
                    </div>
                  )}
                </section>

                {submittedText && (
                  <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm animate-fade-in">
                    <p className="text-slate-700 text-sm font-bold text-center">{submittedText}</p>
                  </section>
                )}
                
                {/* Recent Requests for Mobile (Hidden on Desktop) */}
                <section className="lg:hidden bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" /> 최근 요청
                  </h3>
                  <div className="space-y-2">
                    {recentRequests.slice(0, 5).map((r, idx) => (
                      <div key={`${r.date}-${r.type}-${idx}`} className="text-sm text-slate-700">
                        {formatRecentLabel(r.date, r.type)}
                        {r.studentName && (
                          <span className="text-slate-400 ml-1">· {r.studentName}</span>
                        )}
                      </div>
                    ))}
                    {recentRequests.length === 0 && (
                        <div className="text-xs text-slate-400 text-center py-2">최근 요청 내역이 없습니다.</div>
                    )}
                  </div>
                </section>
            </div>
        </div>
      </main>
    </div>
  );
}
