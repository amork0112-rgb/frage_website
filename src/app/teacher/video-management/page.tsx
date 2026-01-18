"use client";

import { useEffect, useMemo, useState } from "react";
import { Video, Plus, Trash2, PencilLine, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Student = { id: string; name: string; englishName: string; className: string; campus: string; classSortOrder?: number | null };
type Assignment = { id: string; title: string; module: string; description?: string; dueDate: string; className: string; campus?: string };

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
  const [filterDivision, setFilterDivision] = useState<"kinder" | "primary">("kinder");

  const [newTitle, setNewTitle] = useState("");
  const [newModule, setNewModule] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newClass, setNewClass] = useState<string>("All");
  const [newCampus, setNewCampus] = useState<string>("All");
  const [newDivision, setNewDivision] = useState<"kinder" | "primary">("kinder");

  const [intlKinderClasses, setIntlKinderClasses] = useState<string[]>([]);
  const [intlPrimaryClasses, setIntlPrimaryClasses] = useState<string[]>([]);

  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Assignment | null>(null);

  const [autoAction, setAutoAction] = useState<"" | "publish" | "change_date" | "skip">("");
  const [autoDate, setAutoDate] = useState("");
  const [autoToast, setAutoToast] = useState("");
  const [showAutoDatePicker, setShowAutoDatePicker] = useState(false);

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

      try {
        const { data: intlClasses } = await supabase
          .from("classes")
          .select("name, campus, division")
          .eq("campus", "International")
          .order("name", { ascending: true });
        const kinder: string[] = [];
        const primary: string[] = [];
        (intlClasses || []).forEach((row: any) => {
          const name = String(row.name || row.class_name || "").trim();
          const division = String(row.division || "").toLowerCase();
          if (!name) return;
          if (division === "primary") {
            if (!primary.includes(name)) primary.push(name);
          } else if (division === "kinder") {
            if (!kinder.includes(name)) kinder.push(name);
          }
        });
        setIntlKinderClasses(kinder);
        setIntlPrimaryClasses(primary);
      } catch {}
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
      if (newDivision === "primary") return intlPrimaryClasses.map((name) => ({ name, sort: null }));
      return intlKinderClasses.map((name) => ({ name, sort: null }));
    }
    if (newCampus === "All") return classOptionsAll;
    return classOptionsByCampus[newCampus] || classOptionsAll;
  }, [newCampus, newDivision, classOptionsAll, classOptionsByCampus, intlKinderClasses, intlPrimaryClasses]);

  const filterClassOptions = useMemo(() => {
    if (filterCampus === "International") {
      const base = filterDivision === "primary" ? intlPrimaryClasses : intlKinderClasses;
      return base.map((name) => ({ name, sort: null }));
    }
    if (filterCampus === "All") return classOptionsAll;
    return classOptionsByCampus[filterCampus] || classOptionsAll;
  }, [filterCampus, filterDivision, classOptionsAll, classOptionsByCampus, intlKinderClasses, intlPrimaryClasses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const intlKinderSet = new Set(intlKinderClasses);
    const intlPrimarySet = new Set(intlPrimaryClasses);
    return assignments
      .filter((a) => {
        if (filterCampus === "All") return true;
        const camp = a.campus || "All";
        return camp === filterCampus;
      })
      .filter((a) => {
        if (filterCampus !== "International") return true;
        if (filterDivision === "primary") {
          return filterClass === "All"
            ? intlPrimarySet.has(a.className)
            : a.className === filterClass;
        }
        return filterClass === "All"
          ? intlKinderSet.has(a.className)
          : a.className === filterClass;
      })
      .filter((a) => {
        if (filterCampus === "International") return true;
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
  }, [assignments, filterClass, filterCampus, filterDivision, query, intlKinderClasses, intlPrimaryClasses]);

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

  useEffect(() => {
    setNewClass("All");
  }, [newDivision]);

  useEffect(() => {
    setFilterClass("All");
  }, [filterDivision]);

  const isKinderCreateMode = newCampus === "International" && newDivision === "kinder";
  const isKinderFilterMode = filterCampus === "International" && filterDivision === "kinder";

  const autoMeta = useMemo(() => {
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
    const title = `Week ${weekNum} Reading`;
    const moduleName = `Week ${weekNum}`;
    const dayOfWeek = now.getDay();
    const daysUntilSunday = 7 - dayOfWeek;
    const due = new Date(now);
    due.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
    const dueDate = due.toISOString().split("T")[0];
    return { title, moduleName, dueDate };
  }, []);

  const autoCard = useMemo(() => {
    if (!isKinderFilterMode || intlKinderClasses.length === 0) return null;
    const baseClasses = filterClass === "All" ? intlKinderClasses : [filterClass];
    const autoAssignments = assignments.filter((a) => {
      if (a.campus !== "International") return false;
      if (!baseClasses.includes(a.className)) return false;
      if (a.title !== autoMeta.title) return false;
      return true;
    });
    let status: "Draft" | "Scheduled" | "Published" | "Skipped" = "Draft";
    if (autoAssignments.length === 0) {
      status = "Draft";
    } else {
      const hasSkip = autoAssignments.some((a) => (a.description || "").startsWith("[SKIP]"));
      const hasDraft = autoAssignments.some((a) => (a.description || "").startsWith("[DRAFT]"));
      if (hasSkip) status = "Skipped";
      else if (hasDraft) status = "Scheduled";
      else status = "Published";
    }
    const baseLabelList = baseClasses.slice();
    const classesLabel =
      filterClass === "All"
        ? baseLabelList.slice(0, 3).join(", ") + (baseLabelList.length > 3 ? ` 외 ${baseLabelList.length - 3}개` : "")
        : filterClass;
    return {
      weekLabel: autoMeta.moduleName,
      title: autoMeta.title,
      dueDate: autoMeta.dueDate,
      classesLabel: classesLabel || "Kinder classes",
      status,
    };
  }, [assignments, autoMeta, filterClass, intlKinderClasses, isKinderFilterMode]);

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
    if (newCampus === "International" && newDivision === "kinder") return;
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

  const runAutoAction = (action: "publish" | "change_date" | "skip") => {
    if (action === "change_date" && !autoDate) {
      setAutoToast("날짜를 선택해 주세요.");
      return;
    }
    (async () => {
      setAutoAction(action);
      try {
        const res = await fetch("/api/teacher/kinder-auto-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            date: action === "change_date" ? autoDate : undefined,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const code = data?.error || "";
          if (code === "no_kinder_classes") {
            setAutoToast("국제관 킨더 반이 없습니다.");
          } else if (code === "unauthorized" || code === "forbidden") {
            setAutoToast("권한이 없습니다. 다시 로그인해 주세요.");
          } else {
            setAutoToast("요청 처리 중 오류가 발생했습니다.");
          }
          return;
        }
        await refreshAssignments();
        if (action === "publish") {
          setAutoToast("이번 주 과제가 학부모에게 공개되었습니다.");
        } else if (action === "change_date") {
          setAutoToast("마감일이 업데이트되었습니다.");
          setShowAutoDatePicker(false);
        } else if (action === "skip") {
          setAutoToast("이번 주 과제가 건너뛰기로 설정되었습니다.");
        }
      } catch {
        setAutoToast("요청 처리 중 오류가 발생했습니다.");
      } finally {
        setAutoAction("");
      }
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
          <div className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
            newDivision === "kinder" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
          }`}>
            {newDivision === "kinder" ? (
              <>
                <span>⚙️</span>
                <span>Mode: Automatic Weekly Assignments (Kinder)</span>
              </>
            ) : (
              <>
                <span>✍️</span>
                <span>Mode: Manual Assignments with Templates (Primary)</span>
              </>
            )}
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
          {newCampus === "International" && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Division</label>
              <select
                value={newDivision}
                onChange={(e) => setNewDivision(e.target.value as "kinder" | "primary")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="kinder">Kinder</option>
                <option value="primary">Primary</option>
              </select>
            </div>
          )}
          {!isKinderCreateMode && (
            <>
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
                  {newCampus === "International" && newDivision === "primary" && (
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
            </>
          )}
        </div>
        <div className="mt-3">
          {!isKinderCreateMode ? (
            <button onClick={createAssignment} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-frage-navy text-white">
              <Plus className="w-4 h-4" /> 생성
            </button>
          ) : (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                <span>⚙️</span>
                <span>Automatic Weekly Video Assignment</span>
              </div>
              <ul className="text-xs text-blue-700 list-disc pl-5 space-y-1">
                <li>Assignments are generated automatically every week.</li>
                <li>Based on textbook session and lesson progress.</li>
                <li>No manual creation is required for Kinder.</li>
              </ul>
              <div className="text-[11px] text-blue-600 mt-1">
                Next assignment will be generated on <b>Monday</b>.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">캠퍼스 필터</label>
            <select value={filterCampus} onChange={(e) => setFilterCampus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              {campuses.map(c => (<option key={c} value={c}>{CAMPUS_LABELS[c] || c}</option>))}
            </select>
          </div>
          {filterCampus === "International" && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Division</label>
              <select
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value as "kinder" | "primary")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="kinder">Kinder</option>
                <option value="primary">Primary</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">반 필터</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="All">전체</option>
              {filterClassOptions.map(c => (<option key={c.name} value={c.name}>{c.name}</option>))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 mb-1">검색</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목/모듈" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
          </div>
        </div>
      </div>

      {isKinderFilterMode && autoCard && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] font-bold text-blue-800">{autoCard.weekLabel} · Kinder Auto Assignment</div>
              <div className="text-sm font-bold text-slate-900">{autoCard.title}</div>
            </div>
            <div className="text-[11px] font-bold px-2 py-1 rounded-full bg-white text-blue-700 border border-blue-200">
              {autoCard.status === "Published"
                ? "Published"
                : autoCard.status === "Scheduled"
                ? "Scheduled"
                : autoCard.status === "Skipped"
                ? "Skipped"
                : "Draft"}
            </div>
          </div>
          <div className="text-[11px] text-blue-700 space-y-1 mb-3">
            <div>Classes: {autoCard.classesLabel}</div>
            <div>Planned Due Date: {autoCard.dueDate}</div>
            <div>이 과제는 자동 생성되며, 공휴일이나 행사에 맞춰 배포 일정을 조정할 수 있습니다.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runAutoAction("publish")}
              disabled={autoAction === "publish"}
              className="flex-1 min-w-[120px] px-3 py-2 rounded-lg text-xs font-bold bg-frage-navy text-white disabled:opacity-60"
            >
              {autoAction === "publish" ? "Publishing..." : "Publish Now"}
            </button>
            <button
              onClick={() => setShowAutoDatePicker((v) => !v)}
              className="flex-1 min-w-[120px] px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white"
            >
              Change Date
            </button>
            <button
              onClick={() => runAutoAction("skip")}
              disabled={autoAction === "skip"}
              className="flex-1 min-w-[120px] px-3 py-2 rounded-lg text-xs font-bold bg-slate-600 text-white disabled:opacity-60"
            >
              {autoAction === "skip" ? "Processing..." : "Skip This Week"}
            </button>
          </div>
          {showAutoDatePicker && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={autoDate}
                onChange={(e) => setAutoDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              />
              <button
                onClick={() => runAutoAction("change_date")}
                disabled={autoAction === "change_date"}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-indigo-200 text-indigo-700 disabled:opacity-60"
              >
                {autoAction === "change_date" ? "Updating..." : "Save Date"}
              </button>
            </div>
          )}
          {autoToast && (
            <div className="mt-2 text-[11px] text-blue-700">
              {autoToast}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 space-y-1">
              {editId === a.id ? (
                <>
                  <input value={editItem?.title || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                  <input value={editItem?.module || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), module: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                  <input value={editItem?.description || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), description: e.target.value }))} placeholder="Description" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                  <input type="date" value={editItem?.dueDate || ""} onChange={(e) => setEditItem(prev => ({ ...(prev as Assignment), dueDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg白" />
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
                    {intlKinderClasses.includes(a.className) && (
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700"
                        title="This assignment was generated automatically by the system."
                      >
                        Auto (Weekly)
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
