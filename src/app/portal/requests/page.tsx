"use client";

import { useMemo, useState } from "react";
import PortalHeader from "@/components/PortalHeader";
import { Calendar, Clock, Bus, Pill, Send } from "lucide-react";

type RequestType = "absence" | "early_pickup" | "bus_change" | "medication";

export default function RequestsPage() {
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedText, setSubmittedText] = useState<string>("");
  const [recentRequests, setRecentRequests] = useState<
    { date: string; type: RequestType }[]
  >([
    { date: "2025-04-18", type: "absence" },
    { date: "2025-04-15", type: "bus_change" },
  ]);

  const children = [
    { id: "c1", name: "Emma Kim" },
    { id: "c2", name: "Minseo Kim" },
  ];
  const [selectedChildId, setSelectedChildId] = useState(children[0].id);
  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId)!,
    [selectedChildId]
  );

  const [absenceDate, setAbsenceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [absenceReason, setAbsenceReason] = useState("");

  const [pickupDate, setPickupDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [pickupTime, setPickupTime] = useState("");
  const [pickupNote, setPickupNote] = useState("");

  const [busDate, setBusDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [busChangeType, setBusChangeType] = useState<
    "no_bus" | "pickup_change" | "dropoff_change"
  >("no_bus");
  const [busNote, setBusNote] = useState("");

  const [medStart, setMedStart] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [medEnd, setMedEnd] = useState(new Date().toISOString().split("T")[0]);
  const [medName, setMedName] = useState("");
  const [medInstructions, setMedInstructions] = useState("");

  const formatRecentLabel = (dateStr: string, type: RequestType) => {
    const d = new Date(dateStr);
    const formatted = new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
    }).format(d);
    const typeLabel =
      type === "absence"
        ? "결석"
        : type === "early_pickup"
        ? "조기하원"
        : type === "bus_change"
        ? "차량 변경"
        : "투약";
    return `${formatted} • ${typeLabel} • 제출됨`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setSubmittedText("요청이 제출되었습니다. 학원에 전달되었습니다.");
      const dateForRecent =
        selectedType === "medication" ? medStart : selectedType === "bus_change" ? busDate : selectedType === "early_pickup" ? pickupDate : absenceDate;
      setRecentRequests((prev) => {
        const next = [{ date: dateForRecent, type: selectedType! }, ...prev];
        return next.slice(0, 5);
      });
      try {
        const id = `req_${Date.now()}`;
        const item = {
          id,
          childId: selectedChildId,
          childName: selectedChild.name,
          type: selectedType,
          dateStart:
            selectedType === "medication"
              ? medStart
              : selectedType === "bus_change"
              ? busDate
              : selectedType === "early_pickup"
              ? pickupDate
              : absenceDate,
          dateEnd: selectedType === "medication" ? medEnd : undefined,
          time: selectedType === "early_pickup" ? pickupTime : undefined,
          note:
            selectedType === "absence"
              ? absenceReason
              : selectedType === "early_pickup"
              ? pickupNote
              : selectedType === "bus_change"
              ? busNote
              : medInstructions,
          changeType: selectedType === "bus_change" ? busChangeType : undefined,
          medName: selectedType === "medication" ? medName : undefined,
          createdAt: new Date().toISOString(),
        };
        const raw = localStorage.getItem("portal_requests");
        const list = raw ? JSON.parse(raw) : [];
        const nextList = Array.isArray(list) ? [item, ...list] : [item];
        localStorage.setItem("portal_requests", JSON.stringify(nextList));
      } catch {}
      setLoading(false);
    }, 700);
  };

  const clearSubmission = () => setSubmittedText("");

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      <main className="px-4 py-6 max-w-xl mx-auto space-y-8">
        <section>
          <h1 className="text-2xl font-bold text-slate-800">요청 전달</h1>
          <p className="text-slate-500 text-sm mt-1">
            결석, 조기하원, 차량 변경, 투약 요청을 학원에 전달할 수 있습니다.
          </p>
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
            </select>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setSelectedType("absence");
              clearSubmission();
            }}
            className={`flex flex-col items-center justify-center rounded-2xl border p-5 gap-2 min-h-[56px] ${
              selectedType === "absence"
                ? "bg-frage-blue text-white border-frage-blue shadow"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-sm font-bold">결석</span>
          </button>
          <button
            onClick={() => {
              setSelectedType("early_pickup");
              clearSubmission();
            }}
            className={`flex flex-col items-center justify-center rounded-2xl border p-5 gap-2 min-h-[56px] ${
              selectedType === "early_pickup"
                ? "bg-frage-green text-white border-frage-green shadow"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            <Clock className="w-6 h-6" />
            <span className="text-sm font-bold">조기하원</span>
          </button>
          <button
            onClick={() => {
              setSelectedType("bus_change");
              clearSubmission();
            }}
            className={`flex flex-col items-center justify-center rounded-2xl border p-5 gap-2 min-h-[56px] ${
              selectedType === "bus_change"
                ? "bg-frage-yellow text-frage-navy border-frage-yellow shadow"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            <Bus className="w-6 h-6" />
            <span className="text-sm font-bold">차량 변경</span>
          </button>
          <button
            onClick={() => {
              setSelectedType("medication");
              clearSubmission();
            }}
            className={`flex flex-col items-center justify-center rounded-2xl border p-5 gap-2 min-h-[56px] ${
              selectedType === "medication"
                ? "bg-frage-navy text-white border-frage-navy shadow"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            <Pill className="w-6 h-6" />
            <span className="text-sm font-bold">투약</span>
          </button>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          {selectedType === null && (
            <div className="text-slate-500 text-sm">요청 유형을 선택해 주세요.</div>
          )}

          {selectedType === "absence" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">날짜</label>
                <input
                  type="date"
                  required
                  value={absenceDate}
                  onChange={(e) => setAbsenceDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-blue bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">사유 (선택)</label>
                <input
                  type="text"
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="간단한 설명"
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-blue bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-frage-blue text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                {loading ? "제출 중..." : <><Send className="w-5 h-5" /> 제출</>}
              </button>
            </form>
          )}

          {selectedType === "early_pickup" && (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">메모 (선택)</label>
                <input
                  type="text"
                  value={pickupNote}
                  onChange={(e) => setPickupNote(e.target.value)}
                  placeholder="간단한 설명"
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-green bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-frage-green text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                {loading ? "제출 중..." : <><Send className="w-5 h-5" /> 제출</>}
              </button>
            </form>
          )}

          {selectedType === "bus_change" && (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setBusChangeType("no_bus")}
                    className={`px-4 py-3 rounded-lg border text-sm font-bold ${
                      busChangeType === "no_bus"
                        ? "bg-yellow-50 border-frage-yellow text-frage-navy"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    오늘 버스 미이용
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusChangeType("pickup_change")}
                    className={`px-4 py-3 rounded-lg border text-sm font-bold ${
                      busChangeType === "pickup_change"
                        ? "bg-yellow-50 border-frage-yellow text-frage-navy"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    등원 버스 변경
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusChangeType("dropoff_change")}
                    className={`px-4 py-3 rounded-lg border text-sm font-bold ${
                      busChangeType === "dropoff_change"
                        ? "bg-yellow-50 border-frage-yellow text-frage-navy"
                        : "bg-white border-slate-200 text-slate-700"
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
                  placeholder="간단한 설명"
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-yellow bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-frage-yellow text-frage-navy py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                {loading ? "제출 중..." : <><Send className="w-5 h-5" /> 제출</>}
              </button>
            </form>
          )}

          {selectedType === "medication" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  placeholder="간단한 지시사항"
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-frage-navy bg-white h-24"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-frage-navy text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                {loading ? "제출 중..." : <><Send className="w-5 h-5" /> 제출</>}
              </button>
            </form>
          )}
        </section>

        {submittedText && (
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <p className="text-slate-700 text-sm">{submittedText}</p>
          </section>
        )}

        <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3">최근 요청</h3>
          <div className="space-y-2">
            {recentRequests.slice(0, 5).map((r, idx) => (
              <div key={`${r.date}-${r.type}-${idx}`} className="text-sm text-slate-700">
                {formatRecentLabel(r.date, r.type)}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
