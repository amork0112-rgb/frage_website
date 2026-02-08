//app/teacher/dagym/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Check, X, Triangle, Square, ChevronDown, Bell, BellOff, BellRing } from "lucide-react";

// Types
type CommitmentStatus = "unchecked" | "done" | "partial" | "not_done";

type Student = {
  id: string;
  name: string;
  english_name: string;
  send_status: "not_sent" | "sent" | "failed" | "sending"; // sending is UI state
  sent_at: string | null;
};

type Subject = {
  id: string;
  title: string;
};

type ClassItem = {
  id: string;
  name: string;
  weekdays?: string[];
};

// Status Config
const STATUS_CONFIG = {
  unchecked: { icon: Square, color: "text-slate-300", label: "Not checked" },
  done: { icon: Check, color: "text-green-500", label: "Done" },
  partial: { icon: Triangle, color: "text-amber-500", label: "Partial" },
  not_done: { icon: X, color: "text-red-500", label: "Not done" },
};

const NEXT_STATUS: Record<CommitmentStatus, CommitmentStatus> = {
  unchecked: "done",
  done: "partial",
  partial: "not_done",
  not_done: "unchecked",
};

export default function TeacherCoachingPage() {
  // State
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedCampus, setSelectedCampus] = useState<string>("All");
  
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [commitments, setCommitments] = useState<Record<string, CommitmentStatus>>({});
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<"disabled" | "enabled" | "sent">("disabled");

  const [todayClasses, setTodayClasses] = useState<ClassItem[]>([]);
  
  // Fetch Today's Classes
  useEffect(() => {
    async function fetchTodayClasses() {
      try {
        const res = await fetch(`/api/teacher/dagym/today-classes?date=${date}&campus=${selectedCampus}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setTodayClasses(data);
          // Auto-select first class if not already selected or if current selection is not in list
          if (data.length > 0) {
            // Check if current selectedClassId is in the new list. If not, pick the first one.
            const exists = data.find(c => c.id === selectedClassId);
            if (!exists && !selectedClassId) {
              setSelectedClassId(data[0].id);
            }
          }
        } else {
            setTodayClasses([]);
        }
      } catch (error) {
        console.error("Failed to fetch today classes:", error);
      }
    }

    fetchTodayClasses();
  }, [date, selectedCampus]); // Update when date or campus changes

  // Fetch Classes on Mount or Campus Change
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch(`/api/teacher/classes?campus=${selectedCampus}`, { cache: "no-store", credentials: "include" });
        const data = await res.json();
        if (Array.isArray(data)) {
          setClasses(data);
          
          // Note: Initial selection logic is now handled by fetchTodayClasses based on date
          if (!selectedClassId && data.length > 0) {
             // Fallback: if no class selected yet, pick first of all classes (though todayClasses usually takes precedence)
             // We can leave selectedClassId empty until todayClasses loads, or set it here.
             // To avoid conflict, let's just let the user pick or todayClasses pick.
          }
        }
      } catch (e) {
        console.error("Failed to fetch classes", e);
      }
    }
    fetchClasses();
  }, [selectedCampus]);

  // Fetch Commitments when class/date changes
  useEffect(() => {
    if (!selectedClassId || !date) return;

    async function fetchData() {
      setLoading(true);
      try {
        const resData = await fetch(`/api/teacher/commitments?class_id=${selectedClassId}&date=${date}`);
        const data = await resData.json();

        if (data.error) throw new Error(data.error);

        setStudents(data.students || []);
        setSubjects(data.subjects || []);
        
        const map: Record<string, CommitmentStatus> = {};
        (data.commitments || []).forEach((c: any) => {
          // Key must include date to prevent bugs when switching dates
          map[`${c.student_id}-${c.book_id}-${date}`] = c.status;
        });
        setCommitments(map);

      } catch (e) {
        console.error("Failed to fetch data", e);
        showToast("Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedClassId, date]);

  // Check Notification Permission
  useEffect(() => {
    if (Notification.permission === "granted") {
      setNotificationsEnabled("enabled");
    } else {
      setNotificationsEnabled("disabled");
    }
  }, []);

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled("enabled");
      showToast("Notifications enabled", "success");
    }
  };

  // Handlers
  const handleCellClick = async (studentId: string, bookId: string) => {
    const key = `${studentId}-${bookId}-${date}`;
    const currentStatus = commitments[key] || "unchecked";
    const nextStatus = NEXT_STATUS[currentStatus];

    // Optimistic Update
    setCommitments((prev) => ({ ...prev, [key]: nextStatus }));

    // API Call
    try {
      const res = await fetch("/api/teacher/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          class_id: selectedClassId,
          book_id: bookId,
          date,
          status: nextStatus,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      
      // Removed generic "Saved" toast to reduce noise
    } catch (e) {
      console.error(e);
      // Revert on failure
      setCommitments((prev) => ({ ...prev, [key]: currentStatus }));
      showToast("⚠ Save failed", "error");
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const [sending, setSending] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  // Helper to send reports
  const handleSendReports = () => {
    if (!selectedClassId || !date) return;
    
    // Explicitly mention the count of students (who are dajim_enabled)
    const count = students.length;
    if (count === 0) {
      showToast("No students to send reports to", "error");
      return;
    }

    setShowSendModal(true);
  };

  const confirmSend = async () => {
    setShowSendModal(false);
    setSending(true);
    try {
      const res = await fetch("/api/teacher/dagym/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: selectedClassId, date }),
      });

      if (res.status === 409) {
        showToast("이미 전송된 리포트입니다.", "success");
        setStudents((prev) => prev.map((s) => ({ ...s, send_status: "sent" })));
        return;
      }

      if (res.status === 400) {
        const err = await res.json();
        if (err.error === "no_commitments") {
          showToast("전송할 코칭 기록이 없습니다.", "error");
        } else if (err.error === "no_eligible_students") {
          showToast("전송 대상 학생이 없습니다.", "error");
        } else {
          showToast("전송 실패: " + (err.error || "Bad Request"), "error");
        }
        return;
      }

      if (!res.ok) throw new Error("Failed to send");

      const data = await res.json();
      showToast(`학부모 ${data.sent_count}명에게 전송 완료!`, "success");

      // Optimistically update local state to "sent"
      setStudents((prev) => 
        prev.map((s) => ({ ...s, send_status: "sent" }))
      );

    } catch (e) {
      console.error(e);
      showToast("전송 중 오류가 발생했습니다.", "error");
    } finally {
      setSending(false);
    }
  };

  // Render Helpers
  const renderSendStatus = (status: string) => {
    switch (status) {
      case "sent":
        return <span className="text-green-600 font-medium">Sent</span>;
      case "failed":
        return <span className="text-red-600 font-medium">Failed</span>;
      case "sending":
        return <span className="text-blue-600 font-medium">Sending...</span>;
      case "not_sent":
      default:
        return <span className="text-slate-400">Not sent</span>;
    }
  };

  const renderIcon = (status: CommitmentStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.unchecked;
    const Icon = config.icon;
    return <Icon className={`w-6 h-6 ${config.color}`} />;
  };

  const renderNotificationStatus = () => {
    switch (notificationsEnabled) {
      case "enabled":
        return (
          <button 
            className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
            title="Notifications are enabled for this device"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span className="font-medium">Notifications On</span>
          </button>
        );
      case "disabled":
        return (
          <button 
            onClick={requestNotificationPermission}
            className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
            title="Click to enable notifications"
          >
            <BellOff className="w-3.5 h-3.5" />
            <span className="font-medium">Enable Notifications</span>
          </button>
        );
      case "sent":
        return (
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
            <Check className="w-3.5 h-3.5" />
            <span className="font-medium">Sent to Parents</span>
          </div>
        );
    }
  };

  const isAlreadySent = students.some(s => s.send_status === "sent");

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header - Sticky Top 0 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Today's Coaching</h1>
            
            {/* Campus Selector */}
            <div className="relative">
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="w-full sm:w-auto pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="All">All Campuses</option>
                <option value="International">International</option>
                <option value="Andover">Andover</option>
                <option value="Platz">Platz</option>
                <option value="Atheneum">Atheneum</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Class Selector */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full sm:w-auto pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[140px]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                {classes.length === 0 && <option value="">No Classes</option>}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Date Picker */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-3">
             {renderNotificationStatus()}
          </div>
        </div>
        
        {/* Today's Classes Quick Select */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap mr-2">Today's Classes:</span>
          {todayClasses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                selectedClassId === c.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {c.name}
            </button>
          ))}
          {todayClasses.length === 0 && (
            <span className="text-xs text-slate-400 italic">No classes scheduled for today</span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Instruction Text */}
        <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h2 className="text-sm font-bold text-blue-900 mb-2">Today’s Coaching</h2>
          <div className="text-sm text-blue-800 leading-relaxed">
            Click each subject to record today’s coaching result.
            <div className="mt-2 flex items-center gap-2 flex-wrap font-medium">
              <span className="flex items-center gap-1"><Check className="w-4 h-4 text-green-500" /> Done</span>
              <span className="text-blue-300">→</span>
              <span className="flex items-center gap-1"><Triangle className="w-4 h-4 text-amber-500" /> Partial</span>
              <span className="text-blue-300">→</span>
              <span className="flex items-center gap-1"><X className="w-4 h-4 text-red-500" /> Not done</span>
              <span className="text-blue-300">→</span>
              <span className="flex items-center gap-1"><Square className="w-4 h-4 text-slate-300" /> Reset</span>
            </div>
            <span className="block mt-2 text-xs text-blue-600">All changes are saved automatically.</span>
          </div>
        </div>

        {loading && students.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {/* Top-Left Corner - Sticky both top (under header) and left */}
                    <th className="sticky left-0 top-0 z-20 bg-slate-50 px-6 py-4 text-sm font-bold text-slate-700 w-[200px] border-r border-slate-200 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                      Student
                    </th>
                    {subjects.map((sub) => (
                      // Header Cells - Sticky top
                      <th key={sub.id} className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-sm font-bold text-slate-700 min-w-[120px] text-center border-b border-slate-200">
                        {sub.title}
                      </th>
                    ))}
                    {/* Send Status Column */}
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-sm font-bold text-slate-700 min-w-[120px] text-center border-b border-slate-200">
                      <div className="flex flex-col items-center gap-1">
                        <span>Send Status</span>
                        {students.length > 0 && (
                          <button
                            onClick={handleSendReports}
                            disabled={sending || isAlreadySent}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              sending || isAlreadySent
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            {sending ? "Sending..." : isAlreadySent ? "전송 완료" : "학부모 전송"}
                          </button>
                        )}
                      </div>
                    </th>
                    {subjects.length === 0 && (
                      <th className="px-6 py-4 text-sm text-slate-400 font-normal italic">
                        No subjects scheduled for this date.
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      {/* First Column - Sticky Left */}
                      <td className="sticky left-0 z-10 bg-white px-6 py-4 border-r border-slate-100 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{student.name}</span>
                          <span className="text-sm text-slate-500">{student.english_name ? `(${student.english_name})` : ""}</span>
                        </div>
                      </td>
                      {subjects.map((sub) => (
                        <td
                          key={`${student.id}-${sub.id}`}
                          onClick={() => handleCellClick(student.id, sub.id)}
                          className="px-6 py-4 text-center transition-colors select-none cursor-pointer hover:bg-slate-100"
                        >
                          <div className="flex justify-center">
                            {renderIcon(commitments[`${student.id}-${sub.id}-${date}`] || "unchecked")}
                          </div>
                        </td>
                      ))}
                      {subjects.length === 0 && <td className="px-6 py-4"></td>}
                      
                      {/* Send Status Cell */}
                      <td className="px-6 py-4 text-center border-l border-slate-50">
                        {renderSendStatus(student.send_status)}
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && !loading && (
                    <tr>
                      <td colSpan={subjects.length + 2} className="px-6 py-12 text-center text-slate-500">
                        No students found for this class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Hint */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Click each cell to mark the student's coaching status.</p>
          <p>Results will be sent to parents at the end of the day.</p>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm font-bold text-white transition-all transform translate-y-0 opacity-100 z-50 ${
            toast.type === "success" ? "bg-slate-800" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Send Confirmation Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                학부모에게 코칭 결과를 전송할까요?
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                오늘 수업에서 기록된 코칭 결과를 해당 반의 모든 학부모에게 앱 푸시로 전송합니다.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmSend}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <span>전송하기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
