"use client";

import { useEffect, useMemo, useState } from "react";
import { Video, Plus, Trash2, PencilLine, Save, X, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Student = { id: string; name: string; englishName: string; className: string; campus: string; classSortOrder?: number | null };
type Assignment = { id: string; title: string; module: string; description?: string; dueDate: string; className: string; campus?: string };
type WeeklyStatus = "draft" | "scheduled" | "published" | "skipped";

const CAMPUS_VALUES = ["All", "International", "Andover", "Atheneum", "Platz"] as const;
const CAMPUS_LABELS: Record<string, string> = {
  All: "전체",
  International: "국제관",
  Andover: "앤도버관",
  Atheneum: "아테네움관",
  Platz: "플라츠관"
};

export default function TeacherVideoManagementPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classCatalog, setClassCatalog] = useState<string[]>([]);
  const [teacherClassMap, setTeacherClassMap] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("All");
  const [filterCampus, setFilterCampus] = useState<string>("All");

  const [newTitle, setNewTitle] = useState("");
  const [newModule, setNewModule] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newClass, setNewClass] = useState<string>("All");
  const [newCampus, setNewCampus] = useState<string>("All");

  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Assignment | null>(null);

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
      try {
        const { data } = await supabase
          .from("video_assignments")
          .select("*")
          .order("due_date", { ascending: false });
        const list: Assignment[] = Array.isArray(data)
          ? data.map((row: any) => ({
              id: String(row.id),
              title: row.title,
              module: row.module,
              description: row.description || "",
              dueDate: row.due_date,
              className: row.class_name,
              campus: row.campus || "All",
            }))
          : [];
        setAssignments(list);
      } catch {
        setAssignments([]);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments
      .filter((a) => {
        if (filterCampus === "All") return true;
        const camp = a.campus || "All";
        return camp === filterCampus;
      })
      .filter((a) => {
        if (filterClass === "All") return true;
        return a.className === filterClass;
      })
      .filter((a) => {
        if (!q) return true;
        return (
          a.title.toLowerCase().includes(q) ||
          a.module.toLowerCase().includes(q)
        );
      });
  }, [assignments, filterClass, filterCampus, query]);

  const refreshAssignments = async () => {
    const { data } = await supabase
      .from("video_assignments")
      .select("*")
      .order("due_date", { ascending: false });
    const list: Assignment[] = Array.isArray(data)
      ? data.map((row: any) => ({
          id: String(row.id),
          title: row.title,
          module: row.module,
          description: row.description || "",
          dueDate: row.due_date,
          className: row.class_name,
          campus: row.campus || "All",
        }))
      : [];
    setAssignments(list);
  };
  
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
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
    return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  });

  // Mock fetch function for weekly status
  const fetchWeeklyStatus = async () => {
    if (filterCampus !== "International") return;
    
    setLoadingWeeklyStatus(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const intlClasses = (classOptionsByCampus["International"] || []).map(c => c.name);
    const statusList = intlClasses.map((className, index) => {
      // Randomly assign status for demo purposes
      const statuses = ["draft", "scheduled", "published", "skipped", "no_lesson", "needs_review"] as const;
      const status = statuses[index % statuses.length];
      
      const suggestedDueDate = "2026-01-28";
      let confirmedDueDate = null;
      let reason = null;

      if (status === "scheduled" || status === "published") {
        confirmedDueDate = "2026-01-28";
      }
      if (status === "no_lesson") {
        reason = "No regular class this week";
      }
      if (status === "needs_review") {
        reason = "Check lesson coverage";
      }

      return {
        className,
        campus: "International",
        weekKey: selectedWeek,
        status,
        suggestedDueDate,
        confirmedDueDate,
        reason
      };
    });
    
    setWeeklyClassStatus(statusList);
    setLoadingWeeklyStatus(false);
  };

  useEffect(() => {
    if (filterCampus === "International") {
      fetchWeeklyStatus();
    } else {
      setWeeklyClassStatus([]);
    }
  }, [filterCampus, selectedWeek, classOptionsByCampus]);

  const handleControlAction = async (action: "publish" | "change_date" | "skip" | "set_due_date", className: string, date?: string) => {
    // Mock API call
    console.log(`Action: ${action}, Class: ${className}, Date: ${date}`);
    
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
  };

  const isKinderFilterMode = filterCampus === "International";

  const TEMPLATES = [
    {
      label: "Reading Retell",
      titlePrefix: "Reading Retell: ",
      module: "Reading",
      description: "Read the story and retell it in your own words."
    },
    {
      label: "Speaking Opinion",
      titlePrefix: "Speaking Opinion: ",
      module: "Speaking",
      description: "Express your opinion on the topic."
    },
    {
      label: "Fluency Check",
      titlePrefix: "Fluency Check",
      module: "Reading",
      description: "Read the passage clearly and fluently."
    },
    {
      label: "Presentation Practice",
      titlePrefix: "Presentation Practice",
      module: "Speaking",
      description: "Practice your presentation skills."
    }
  ];

  const applyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setNewTitle(tmpl.titlePrefix);
    setNewModule(tmpl.module);
    setNewDescription(tmpl.description);
    setShowTemplateModal(false);
  };

  const createAssignment = () => {
    if (!newTitle.trim() || !newModule.trim() || !newDue || newClass === "All") return;
    (async () => {
      await supabase.from("video_assignments").insert({
        title: newTitle.trim(),
        module: newModule.trim(),
        description: newDescription.trim(),
        due_date: newDue,
        class_name: newClass,
        campus: newCampus === "All" ? null : newCampus,
      });
      await refreshAssignments();
    })();
    setNewTitle("");
    setNewModule("");
    setNewDescription("");
    setNewDue("");
    setNewClass("All");
    setNewCampus("All");
  };

  const startEdit = (id: string) => {
    const item = assignments.find(a => a.id === id) || null;
    setEditId(id);
    setEditItem(item ? { ...item } : null);
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditItem(null);
  };
  const saveEdit = () => {
    if (!editId || !editItem) return;
    if (!editItem.title.trim() || !editItem.module.trim() || !editItem.dueDate || !editItem.className) return;
    (async () => {
      await supabase
        .from("video_assignments")
        .update({
          title: editItem.title.trim(),
          module: editItem.module.trim(),
          description: editItem.description?.trim() || "",
          due_date: editItem.dueDate,
          class_name: editItem.className,
          campus: editItem.campus === "All" ? null : editItem.campus,
        })
        .eq("id", Number(editId));
      await refreshAssignments();
    })();
    setEditId(null);
    setEditItem(null);
  };
  const remove = (id: string) => {
    (async () => {
      await supabase.from("video_assignments").delete().eq("id", Number(id));
      await refreshAssignments();
    })();
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Video className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">Video Management</h1>
        </div>
        {newCampus === "International" && (
          <div className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 bg-blue-50 text-blue-700">
            <span>⚙️</span>
            <span>Mode: Semi-Automatic Weekly Assignments (International)</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
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
            <label className="block text-xs font-bold text-slate-500 mb-1">마감일</label>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">제목</label>
            <div className="flex gap-2">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Into Reading 1.3" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
              {newCampus === "International" && (
                <button onClick={() => setShowTemplateModal(true)} className="px-3 py-2 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap hover:bg-indigo-100">
                  Templates
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">모듈/차시</label>
            <input value={newModule} onChange={(e) => setNewModule(e.target.value)} placeholder="[Module 5-1] Day 18" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">설명 (선택)</label>
            <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="과제 설명..." className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
          </div>
        </div>
        <div className="mt-3">
          <button
            onClick={createAssignment}
            disabled={!newTitle.trim() || !newModule.trim() || !newDue || newClass === "All"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-frage-navy text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> 생성
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-slate-900 text-sm">Management Scope</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Campus</label>
            <select value={filterCampus} onChange={(e) => setFilterCampus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              {campuses.map(c => (<option key={c} value={c}>{CAMPUS_LABELS[c] || c}</option>))}
            </select>
          </div>
          {isKinderFilterMode && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Week</label>
              <select 
                value={selectedWeek} 
                onChange={(e) => setSelectedWeek(e.target.value)} 
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                {/* Mock week options - In real app, generate dynamically */}
                <option value="2026-W01">Week 1 (Jan 01 - Jan 07)</option>
                <option value="2026-W02">Week 2 (Jan 08 - Jan 14)</option>
                <option value="2026-W03">Week 3 (Jan 15 - Jan 21)</option>
                <option value="2026-W04">Week 4 (Jan 22 - Jan 28)</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Class Filter</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="All">All Classes</option>
              {filterClassOptions.map(c => (<option key={c.name} value={c.name}>{c.name}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title or Module..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            />
          </div>
        </div>
      </div>

      {/* Weekly Assignment Overview (Kinder Only) */}
      {isKinderFilterMode && (
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
                     <div className="font-mono text-sm font-medium">
                       {item.confirmedDueDate ? (
                         <span className="text-slate-900">{item.confirmedDueDate}</span>
                       ) : item.suggestedDueDate ? (
                         <span className="text-slate-400">{item.suggestedDueDate} (Suggested)</span>
                       ) : (
                         <span className="text-slate-300">-</span>
                       )}
                     </div>
                     {item.reason && (
                       <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                         Reason: {item.reason}
                       </div>
                     )}
                  </div>

                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
                    {item.status === "draft" && (
                       <>
                         <button 
                           onClick={() => handleControlAction("set_due_date", item.className)}
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
                          onClick={() => handleControlAction("change_date", item.className)}
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
                        onClick={() => handleControlAction("change_date", item.className)}
                        className="w-full py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded hover:bg-slate-50"
                      >
                        Change Date
                      </button>
                    )}
                    {item.status === "needs_review" && (
                      <button 
                         onClick={() => handleControlAction("set_due_date", item.className)}
                         className="w-full py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded hover:bg-slate-50"
                      >
                        Review & Set Date
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assignment Records (Existing List) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="text-slate-400">🗂</span>
            Assignment Records
          </h2>
          <div className="text-xs text-slate-400">
            Total {filtered.length} assignments
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 space-y-1">
              {editId === a.id ? (
                <>
                  <input value={editItem?.title || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                  <input value={editItem?.module || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), module: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                  <input value={editItem?.description || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), description: e.target.value }))} placeholder="Description" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                  <input type="date" value={editItem?.dueDate || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), dueDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                  <select value={editItem?.className || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), className: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                    {classes.filter(c => c !== "All").map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  <select value={editItem?.campus || "All"} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), campus: e.target.value === "All" ? undefined : e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                    {campuses.map(c => (<option key={c} value={c}>{CAMPUS_LABELS[c] || c}</option>))}
                  </select>
                  <div className="flex items-center gap-2 pt-2">
                    <button onClick={saveEdit} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-frage-navy text-white">
                      <Save className="w-4 h-4" /> 저장
                    </button>
                    <button onClick={cancelEdit} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-slate-200 text-slate-700">
                      <X className="w-4 h-4" /> 취소
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-bold text-slate-900">{a.title}</div>
                    {a.campus === "International" && (
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700"
                        title="This assignment is managed in the semi-automatic flow."
                      >
                        Intl
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">{a.module}</div>
                  {a.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.description}</div>}
                  <div className="text-xs text-slate-500">Due {a.dueDate}</div>
                  <div className="text-xs font-bold text-slate-600 mt-1">{a.className}{a.campus ? ` • ${a.campus}` : ""}</div>
                  <div className="flex items-center gap-2 pt-2">
                    <button onClick={() => startEdit(a.id)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-white border border-slate-200">
                      <PencilLine className="w-4 h-4" /> 수정
                    </button>
                    <button onClick={() => remove(a.id)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-red-600 text-white">
                      <Trash2 className="w-4 h-4" /> 삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-sm text-slate-600">등록된 영상 과제가 없습니다.</div>
        )}
      </div>
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
                  <div className="text-xs text-slate-500">{tmpl.description}</div>
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
