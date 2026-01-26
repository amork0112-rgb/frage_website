//app/teacher/dagym/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Check, X, Triangle, Square, ChevronDown } from "lucide-react";

// Types
type CommitmentStatus = "unchecked" | "done" | "partial" | "not_done";

type Student = {
  id: string;
  name: string;
  english_name: string;
};

type Subject = {
  id: string;
  title: string;
};

type ClassItem = {
  id: string;
  name: string;
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
  
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [commitments, setCommitments] = useState<Record<string, CommitmentStatus>>({});
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Generation Status
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false); // based on schedule
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);

  // Fetch Classes on Mount
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("/api/teacher/classes");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setClasses(data);
          setSelectedClassId(data[0].id || "");
        }
      } catch (e) {
        console.error("Failed to fetch classes", e);
      }
    }
    fetchClasses();
  }, []);

  // Fetch Commitments when class/date changes
  useEffect(() => {
    if (!selectedClassId || !date) return;

    async function fetchData() {
      setLoading(true);
      setStatusLoaded(false);
      try {
        const [resData, resStatus] = await Promise.all([
            fetch(`/api/teacher/commitments?class_id=${selectedClassId}&date=${date}`),
            fetch(`/api/teacher/dagym/status?class_id=${selectedClassId}&date=${date}`)
        ]);

        const data = await resData.json();
        const status = await resStatus.json();

        if (data.error) throw new Error(data.error);

        setStudents(data.students || []);
        setSubjects(data.subjects || []);
        
        const map: Record<string, CommitmentStatus> = {};
        (data.commitments || []).forEach((c: any) => {
          // Key must include date to prevent bugs when switching dates
          map[`${c.student_id}-${c.book_id}-${date}`] = c.status;
        });
        setCommitments(map);

        // Handle Status
        if (!status.error) {
           setAlreadyGenerated(status.alreadyGenerated);
           // Button Enable Rules: !alreadyGenerated AND !hasHoliday AND !hasEvent AND hasLesson
           const available = !status.alreadyGenerated && !status.hasHoliday && !status.hasEvent && status.hasLesson;
           setCanGenerate(available);
        } else {
           console.error("Status error:", status.error);
           setCanGenerate(false);
        }
        setStatusLoaded(true);

      } catch (e) {
        console.error("Failed to fetch data", e);
        showToast("Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedClassId, date]);

  const handleGenerate = async () => {
    if (isGenerating || !canGenerate) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch("/api/teacher/dagym/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: selectedClassId, date })
      });
      const json = await res.json();

      if (json.ok) {
        showToast("Today’s dagym has been generated successfully.", "success");
        setAlreadyGenerated(true);
        setCanGenerate(false);
        
        // Refresh grid
        const resData = await fetch(`/api/teacher/commitments?class_id=${selectedClassId}&date=${date}`);
        const data = await resData.json();
        if (!data.error) {
           setStudents(data.students || []);
           setSubjects(data.subjects || []);
           const map: Record<string, CommitmentStatus> = {};
           (data.commitments || []).forEach((c: any) => {
             map[`${c.student_id}-${c.book_id}-${date}`] = c.status;
           });
           setCommitments(map);
        }
      } else {
        if (json.reason === "already_generated") {
           showToast("Today’s dagym has already been generated.", "error");
           setAlreadyGenerated(true);
           setCanGenerate(false);
        } else if (json.reason === "not_available_today") {
           showToast("Dagym is not available today due to the schedule.", "error");
           setCanGenerate(false);
        } else {
           showToast("An error occurred while generating today’s dagym.", "error");
        }
      }
    } catch (e) {
      showToast("An error occurred while generating today’s dagym.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handlers
  const handleCellClick = async (studentId: string, bookId: string) => {
    // Guard: Block clicks if not generated yet
    if (!alreadyGenerated) return;

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
      
      showToast("✓ Saved", "success");
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

  // Render Helpers
  const renderIcon = (status: CommitmentStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.unchecked;
    const Icon = config.icon;
    return <Icon className={`w-6 h-6 ${config.color}`} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header - Sticky Top 0 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Today's Coaching</h1>
            
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Generator Section */}
        {statusLoaded && (
          <div className="mb-6 flex flex-col items-start gap-1">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                !canGenerate || isGenerating
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              }`}
            >
              {alreadyGenerated ? "Today’s Dagym Generated" : isGenerating ? "Generating..." : "Generate Today’s Dagym"}
            </button>
            <span className="text-xs text-slate-400">This action can only be performed once per day.</span>
          </div>
        )}

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
                    {subjects.length === 0 && (
                      <th className="px-6 py-4 text-sm text-slate-400 font-normal italic">
                        No subjects scheduled for today
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      {/* First Column - Sticky Left */}
                      <td className="sticky left-0 z-10 bg-white px-6 py-4 border-r border-slate-100 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                        <div className="flex flex-row items-center gap-1">
                          <span className="font-bold text-slate-800">{student.name}</span>
                          <span className="text-sm text-slate-500">{student.english_name ? `(${student.english_name})` : ""}</span>
                        </div>
                      </td>
                      {subjects.map((sub) => (
                        <td
                          key={`${student.id}-${sub.id}`}
                          onClick={() => handleCellClick(student.id, sub.id)}
                          className={`px-6 py-4 text-center transition-colors select-none ${
                            alreadyGenerated 
                              ? "cursor-pointer hover:bg-slate-100" 
                              : "cursor-not-allowed opacity-50"
                          }`}
                        >
                          <div className="flex justify-center">
                            {renderIcon(commitments[`${student.id}-${sub.id}-${date}`] || "unchecked")}
                          </div>
                        </td>
                      ))}
                      {subjects.length === 0 && <td className="px-6 py-4"></td>}
                    </tr>
                  ))}
                  {students.length === 0 && !loading && (
                    <tr>
                      <td colSpan={subjects.length + 1} className="px-6 py-12 text-center text-slate-500">
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
    </div>
  );
}
