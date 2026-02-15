//app/teacher/video-management/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Plus, X, Settings, LayoutGrid, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Student = { id: string; name: string; englishName: string; className: string; campus: string; classSortOrder?: number | null };

const CAMPUS_VALUES = ["All", "International", "Andover", "Atheneum", "Platz"] as const;
const CAMPUS_LABELS: Record<string, string> = {
  All: "All",
  International: "International",
  Andover: "Andover",
  Atheneum: "Atheneum",
  Platz: "Platz"
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

// Helper to get weeks for a specific month
const getWeeksForMonth = (year: number, monthIndex: number) => {
  const weeks = [];
  const monthStr = String(monthIndex + 1).padStart(2, '0');
  
  // Unconditionally return 4 weeks per month as requested
  for (let i = 1; i <= 4; i++) {
    weeks.push({
      label: `Week ${i}`,
      value: `${year}-${monthStr}-W${i}`
    });
  }
  return weeks;
};


const KINDER_CLASS_KEYWORDS = ["Kepler", "Platon", "Euclid", "Gauss", "Edison", "Thales", "Einstein", "Darwin"];
// NOTE: Kinder classes are intentionally filtered by naming convention. 
// This avoids adding class_level or type columns to DB.

// Helper to get the current week in YYYY-MM-W# format
const getCurrentWeekKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth(); // 0-indexed
  const monthStr = String(monthIndex + 1).padStart(2, '0');

  // Calculate the week number within the month
  // Assuming week 1 is days 1-7, week 2 is 8-14, etc.
  const dayOfMonth = now.getDate();
  const weekNumber = Math.ceil(dayOfMonth / 7);

  return `${year}-${monthStr}-W${weekNumber}`;
};

export default function TeacherVideoManagementPage() {
  const router = useRouter();
  
  // View Mode State
  const [viewMode, setViewMode] = useState<"primary" | "kinder">("primary");

  const [students, setStudents] = useState<Student[]>([]);
  const [classCatalog, setClassCatalog] = useState<string[]>([]);
  const [teacherClassMap, setTeacherClassMap] = useState<Record<string, string[]>>({});
  const [filterClass, setFilterClass] = useState<string>("All");
  const [filterCampus, setFilterCampus] = useState<string>("All");

  const [currentYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const [newTitle, setNewTitle] = useState("");
  const [newModule, setNewModule] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newRelease, setNewRelease] = useState("");
  const [newClass, setNewClass] = useState<string>("All");
  const [newCampus, setNewCampus] = useState<string>("All");

  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/teacher/students", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        const arr: Student[] = Array.isArray(data) ? data : data.items || [];
        setStudents(arr);
      } catch {
        setStudents([]);
      }
      setClassCatalog([]);
      setTeacherClassMap({});
    };
    load();
  }, []);

  const classOptionsAll = useMemo(() => {
    const map = new Map<string, number | null>();
    students.forEach((s) => {
      const name = (s.className || "").trim();
      if (!name) return;
      const sort = typeof s.classSortOrder === "number" ? s.classSortOrder : null;
      const existing = map.get(name);
      if (existing === undefined) {
        map.set(name, sort);
      } else if (sort !== null && (existing === null || sort < existing)) {
        map.set(name, sort);
      }
    });
    classCatalog.forEach((name) => {
      const trimmed = (name || "").trim();
      if (!trimmed) return;
      if (!map.has(trimmed)) {
        map.set(trimmed, null);
      }
    });
    Object.values(teacherClassMap).flat().forEach((name) => {
      const trimmed = (name || "").trim();
      if (!trimmed) return;
      if (!map.has(trimmed)) {
        map.set(trimmed, null);
      }
    });
    const arr = Array.from(map.entries()).map(([name, sort]) => ({ name, sort }));
    arr.sort((a, b) => {
      if (a.sort == null && b.sort == null) return a.name.localeCompare(b.name);
      if (a.sort == null) return 1;
      if (b.sort == null) return -1;
      return a.sort - b.sort || a.name.localeCompare(b.name);
    });
    return arr;
  }, [students, classCatalog, teacherClassMap]);

  const classOptionsByCampus = useMemo(() => {
    const map: Record<string, { name: string; sort: number | null }[]> = {};
    const seen: Record<string, Set<string>> = {};
    students.forEach((s) => {
      const campus = (s.campus || "").trim();
      const name = (s.className || "").trim();
      if (!campus || !name) return;
      if (!map[campus]) {
        map[campus] = [];
        seen[campus] = new Set();
      }
      if (seen[campus].has(name)) return;
      const sort = typeof s.classSortOrder === "number" ? s.classSortOrder : null;
      map[campus].push({ name, sort });
      seen[campus].add(name);
    });
    Object.keys(map).forEach((campus) => {
      map[campus].sort((a, b) => {
        if (a.sort == null && b.sort == null) return a.name.localeCompare(b.name);
        if (a.sort == null) return 1;
        if (b.sort == null) return -1;
        return a.sort - b.sort || a.name.localeCompare(b.name);
      });
    });
    return map;
  }, [students]);

  const classes = useMemo(() => {
    return ["All", ...classOptionsAll.map((c) => c.name)];
  }, [classOptionsAll]);

  const campuses = useMemo(() => CAMPUS_VALUES.slice(), []);

  const newClassOptions = useMemo(() => {
    if (newCampus === "International") {
      return classOptionsByCampus["International"] || [];
    }
    if (newCampus === "All") return classOptionsAll;
    return classOptionsByCampus[newCampus] || [];
  }, [newCampus, classOptionsAll, classOptionsByCampus]);

  const filterClassOptions = useMemo(() => {
    if (filterCampus === "International") {
      return classOptionsByCampus["International"] || [];
    }
    if (filterCampus === "All") return classOptionsAll;
    return classOptionsByCampus[filterCampus] || [];
  }, [filterCampus, classOptionsAll, classOptionsByCampus]);

  useEffect(() => {
    setNewClass("All");
  }, [newCampus]);
  useEffect(() => {
    setFilterClass("All");
  }, [filterCampus]);

  const [weeklyClassStatus, setWeeklyClassStatus] = useState<{
    className: string;
    campus: string;
    weekKey: string;
    status: "draft" | "scheduled" | "published" | "skipped" | "no_lesson" | "needs_review";
    suggestedDueDate: string | null;
    confirmedDueDate: string | null;
    reason: string | null;
  }[]>([]);
  const [loadingWeeklyStatus, setLoadingWeeklyStatus] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // Initialize with the dynamically calculated current week
    return getCurrentWeekKey();
  });

  const weekOptions = useMemo(() => {
    return getWeeksForMonth(currentYear, selectedMonth);
  }, [currentYear, selectedMonth]);

  useEffect(() => {
    if (viewMode === "kinder" && weekOptions.length > 0) {
      const exists = weekOptions.find(w => w.value === selectedWeek);
      if (!exists) {
        setSelectedWeek(weekOptions[0].value);
      }
    }
  }, [selectedMonth, weekOptions, viewMode, selectedWeek]);

  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");

  const startEditing = (className: string, currentDate?: string | null) => {
    setEditingClass(className);
    setEditDate(currentDate || new Date().toISOString().split('T')[0]);
  };

  const cancelEditing = () => {
    setEditingClass(null);
    setEditDate("");
  };

  const saveDate = (className: string) => {
    if (!editDate) return;
    const item = weeklyClassStatus.find(i => i.className === className);
    if (!item) return;

    let action: "set_due_date" | "change_date" = "change_date";
    if (item.status === "draft" || item.status === "needs_review") {
      action = "set_due_date";
    }
    
    handleControlAction(action, className, editDate);
    setEditingClass(null);
    setEditDate("");
  };

  // Fetch weekly status from API
  const fetchWeeklyStatus = async () => {
    if (viewMode !== "kinder") return;
    
    // If campus is All, we can't show weekly status for specific campus
    // or we could default to International. For now, let's require a specific campus.
    if (filterCampus === "All") {
      setWeeklyClassStatus([]);
      return;
    }

    setLoadingWeeklyStatus(true);
    
    try {
      // Fetch from API
      const targetCampus = filterCampus;
      const res = await fetch(
        `/api/weekly-assignments?campus=${targetCampus}&week=${selectedWeek}`,
        { credentials: "include" }
      );
      const data = await res.json();
      const dbItems = Array.isArray(data) ? data : [];

      // Merge with full class list to ensure all classes are shown
      // Filter only Kinder classes (explicit list) to exclude Primary classes (e.g. R-starting) in International campus
      const allClasses = (classOptionsByCampus[targetCampus] || [])
        .map(c => c.name)
        .filter(name => KINDER_CLASS_KEYWORDS.some(k => name.includes(k)));
      
      const statusList = allClasses.map(className => {
        const found = dbItems.find((item: any) => item.className === className);
        if (found) return found;
        
        // Default 'draft' item for classes without records
        return {
          className,
          campus: targetCampus,
          weekKey: selectedWeek,
          status: "draft",
          suggestedDueDate: null,
          confirmedDueDate: null,
          reason: null
        };
      });
      
      setWeeklyClassStatus(statusList);
    } catch (err) {
      console.error(err);
      setWeeklyClassStatus([]);
    } finally {
      setLoadingWeeklyStatus(false);
    }
  };

  useEffect(() => {
    if (viewMode === "kinder") {
      setFilterCampus("International");
      fetchWeeklyStatus();
    }
  }, [viewMode, selectedWeek, classOptionsByCampus]);

  // Re-fetch when filterCampus changes in Kinder mode
  useEffect(() => {
    if (viewMode === "kinder") {
      fetchWeeklyStatus();
    }
  }, [filterCampus]);

  const handleControlAction = async (action: "publish" | "change_date" | "skip" | "set_due_date", className: string, date?: string) => {
    const campus = filterCampus === "All" ? "International" : filterCampus;

    // Optimistic update
    setWeeklyClassStatus(prev => prev.map(item => {
      if (item.className !== className) return item;
      
      if (action === "publish") {
        return { ...item, status: "published" };
      }
      if (action === "skip") {
        return { ...item, status: "skipped", reason: "Skipped by teacher" };
      }
      if (action === "set_due_date" || action === "change_date") {
        return { ...item, status: "scheduled", confirmedDueDate: date || item.suggestedDueDate };
      }
      return item;
    }));

    // Real API call
    try {
      await fetch("/api/weekly-assignments/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campus,
          className,
          weekKey: selectedWeek,
          action,
          confirmedDueDate: date,
          reason: action === "skip" ? "Skipped by teacher" : null
        })
      });
    } catch (err) {
      console.error("Failed to update status", err);
      // Revert logic could go here
    }
  };

  const TEMPLATES = [
    {
      label: "Reading Retell",
      titlePrefix: "Reading Retell: ",
      module: "Reading",
    },
    {
      label: "Speaking Opinion",
      titlePrefix: "Speaking Opinion: ",
      module: "Speaking",
    },
    {
      label: "Fluency Check",
      titlePrefix: "Fluency Check",
      module: "Reading",
    },
    {
      label: "Presentation Practice",
      titlePrefix: "Presentation Practice",
      module: "Speaking",
    }
  ];

  const applyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setNewTitle(tmpl.titlePrefix);
    setNewModule(tmpl.module);
    setShowTemplateModal(false);
  };

  const createAssignment = () => {
    if (!newTitle.trim() || !newModule.trim() || !newDue || !newRelease || newClass === "All") {
      alert("Please fill in all required fields (Class, Title, Module, Release Date, Due Date).");
      return;
    }
    if (newDue <= newRelease) {
      alert("Due date must be after release date.");
      return;
    }

    (async () => {
      await supabase.from("video_assignments").insert({
        title: newTitle.trim(),
        module: newModule.trim(),
        due_date: newDue,
        release_at: newRelease,
        class_name: newClass,
        campus: newCampus === "All" ? null : newCampus,
      });
    })();
    setNewTitle("");
    setNewModule("");
    setNewDue("");
    setNewRelease("");
    setNewClass("All");
    setNewCampus("All");
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Video className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">Video Management</h1>
        </div>
      </div>

      {/* Mode Switch */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setViewMode("primary")}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
            viewMode === "primary"
              ? "bg-frage-navy text-white shadow-md"
              : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Primary Assignments
        </button>
        <button
          onClick={() => setViewMode("kinder")}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
            viewMode === "kinder"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Kinder Weekly Control
        </button>
      </div>

      {/* Primary Mode: Create Assignment Panel */}
      {viewMode === "primary" && false && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-900">
            <Plus className="w-4 h-4 text-frage-navy" />
            Create New Assignment
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">캠퍼스(선택)</label>
              <select value={newCampus} onChange={(e) => setNewCampus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                {campuses.map(c => (<option key={c} value={c}>{CAMPUS_LABELS[c] || c}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">반</label>
              <select value={newClass} onChange={(e) => setNewClass(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value="All">전체</option>
                {newClassOptions.map(c => (<option key={c.name} value={c.name}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">게시일 (Release)</label>
              <input type="datetime-local" value={newRelease} onChange={(e) => setNewRelease(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">마감일 (Due)</label>
              <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">제목</label>
              <div className="flex gap-2">
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Into Reading 1.3" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                <button onClick={() => setShowTemplateModal(true)} className="px-3 py-2 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap hover:bg-indigo-100">
                  Templates
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">모듈/차시</label>
              <input value={newModule} onChange={(e) => setNewModule(e.target.value)} placeholder="[Module 5-1] Day 18" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={createAssignment}
              disabled={!newTitle.trim() || !newModule.trim() || !newDue || !newRelease || newClass === "All"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-frage-navy text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> 생성
            </button>
          </div>
        </div>
      )}

      {/* Filters (Shared) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-slate-900 text-sm">Management Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          {viewMode !== "kinder" && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Campus</label>
              <select value={filterCampus} onChange={(e) => setFilterCampus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                {campuses.map(c => (<option key={c} value={c}>{CAMPUS_LABELS[c] || c}</option>))}
              </select>
            </div>
          )}
          {viewMode === "kinder" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Month</label>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Week</label>
                <select 
                  value={selectedWeek} 
                  onChange={(e) => setSelectedWeek(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  {weekOptions.map(w => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {viewMode !== "kinder" && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Class Filter</label>
              <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                <option value="All">All Classes</option>
                {filterClassOptions.map(c => (<option key={c.name} value={c.name}>{c.name}</option>))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Kinder Weekly Control Panel (Kinder Only) */}
      {viewMode === "kinder" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-blue-600">📦</span>
              Weekly Assignment Overview
              <span className="text-xs font-normal text-slate-500 ml-2 bg-slate-100 px-2 py-1 rounded">
                {selectedWeek}
              </span>
            </h2>
            <button 
              onClick={fetchWeeklyStatus}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <Video className="w-3 h-3" /> Refresh Status
            </button>
          </div>

          {loadingWeeklyStatus ? (
             <div className="text-center py-10 text-slate-500">Loading weekly status...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklyClassStatus
                .filter(item => filterClass === "All" || item.className === filterClass)
                .map((item) => (
                <div key={item.className} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 text-lg">{item.className}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                      item.status === 'published' ? 'bg-green-100 text-green-700' :
                      item.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      item.status === 'skipped' ? 'bg-slate-100 text-slate-500 line-through' :
                      item.status === 'no_lesson' ? 'bg-yellow-50 text-yellow-600' :
                      item.status === 'needs_review' ? 'bg-red-50 text-red-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                     <div className="text-xs text-slate-500 mb-1">Due Date</div>
                     {editingClass === item.className ? (
                       <div className="flex gap-2">
                         <input 
                           type="date" 
                           value={editDate} 
                           onChange={(e) => setEditDate(e.target.value)}
                           className="w-full px-2 py-1 text-sm border border-slate-200 rounded"
                         />
                       </div>
                     ) : (
                       <div className="font-mono text-sm font-medium">
                         {item.confirmedDueDate ? (
                           <span className="text-slate-900">{item.confirmedDueDate}</span>
                         ) : item.suggestedDueDate ? (
                           <span className="text-slate-400">{item.suggestedDueDate} (Suggested)</span>
                         ) : (
                           <span className="text-slate-300">-</span>
                         )}
                       </div>
                     )}
                     {item.reason && (
                       <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                         Reason: {item.reason}
                       </div>
                     )}
                  </div>

                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
                    {editingClass === item.className ? (
                      <>
                        <button 
                          onClick={() => saveDate(item.className)}
                          className="flex-1 py-1.5 bg-frage-navy text-white text-xs font-bold rounded hover:bg-opacity-90"
                        >
                          Save
                        </button>
                        <button 
                          onClick={cancelEditing}
                          className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {item.status === "draft" && (
                           <>
                             <button 
                               onClick={() => startEditing(item.className, item.suggestedDueDate)}
                               className="flex-1 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded hover:bg-blue-100"
                             >
                               Set Date
                             </button>
                             <button 
                               onClick={() => handleControlAction("skip", item.className)}
                               className="flex-1 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded hover:bg-slate-100"
                             >
                               Skip
                             </button>
                           </>
                        )}
                        {item.status === "scheduled" && (
                          <>
                            <button 
                              onClick={() => handleControlAction("publish", item.className)}
                              className="flex-1 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 shadow-sm"
                            >
                              Publish
                            </button>
                            <button 
                              onClick={() => startEditing(item.className, item.confirmedDueDate)}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded hover:bg-slate-50"
                            >
                              Change
                            </button>
                            <button 
                               onClick={() => handleControlAction("skip", item.className)}
                               className="px-2 py-1.5 text-slate-400 hover:text-red-500"
                            >
                               <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {item.status === "published" && (
                          <button 
                            onClick={() => startEditing(item.className, item.confirmedDueDate)}
                            className="w-full py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded hover:bg-slate-50"
                          >
                            Change Date
                          </button>
                        )}
                        {item.status === "needs_review" && (
                          <button 
                             onClick={() => startEditing(item.className, item.suggestedDueDate)}
                             className="w-full py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded hover:bg-slate-50"
                          >
                            Review & Set Date
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assignment Records List Removed per user request */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Select Assignment Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  onClick={() => applyTemplate(tmpl)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-frage-blue hover:bg-blue-50 transition-colors group"
                >
                  <div className="font-bold text-slate-800 group-hover:text-frage-blue mb-1">{tmpl.label}</div>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                    Module: {tmpl.module}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
