"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Video, CheckCircle, Search, X, Bot, AlertCircle, Settings, Database } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AIEvaluation = {
  scores: {
    fluency: number;
    volume: number;
    speed: number;
    pronunciation: number;
    performance: number;
  };
  average: number;
  pronunciation_flags: { word: string; time: number }[];
  teacher_feedback_draft: {
    overall_message: string;
    strengths: string[];
    focus_point: string;
    next_try_guide: string;
  };
  parent_report_message: string;
  needs_teacher_review: boolean;
  ai_confidence: number;
};

type Student = { id: string; name: string; englishName: string; className: string; campus: string; parentAccountId?: string };
type Status = "미제출" | "제출 완료" | "피드백 완료";
type Homework = {
  id: string;
  assignmentId: string;
  studentId: string;
  name: string;
  englishName: string;
  className: string;
  campus: string;
  title: string;
  dueDate: string;
  status: Status;
  videoUrl?: string | null;
  aiEval?: AIEvaluation | null;
};

type Feedback = {
  overall_message: string;
  fluency: number;
  volume: number;
  speed: number;
  pronunciation: number;
  performance: number;
  strengths: string[];
  focus_point: string;
  next_try_guide: string;
  parent_report_message: string;
  average: number;
  updatedAt: string;
};

const strengthOptions = [
  "Clear pronunciation",
  "Steady pace",
  "Confident eye contact",
  "Expressive intonation",
  "Consistent eye tracking",
  "Well-managed punctuation pauses"
];
const scoreDesc: Record<keyof Omit<Feedback, "overall_message" | "strengths" | "focus_point" | "next_try_guide" | "parent_report_message" | "average" | "updatedAt">, Record<number, string>> = {
  fluency: {
    1: "Reads with frequent pauses",
    2: "Developing flow with some pauses",
    3: "Steady pacing with minor pauses",
    4: "Smooth and confident flow",
    5: "Flawless, native-like flow"
  },
  volume: {
    1: "Often too quiet to hear clearly",
    2: "Generally audible but inconsistent",
    3: "Clear and consistent volume",
    4: "Strong, clear projection throughout",
    5: "Perfectly modulated volume"
  },
  speed: {
    1: "Reads too slowly to maintain flow",
    2: "Developing pace, sometimes uneven",
    3: "Appropriate pace most of the time",
    4: "Natural, well-controlled pacing",
    5: "Ideal pacing with dramatic pauses"
  },
  pronunciation: {
    1: "Frequent sound errors",
    2: "Generally accurate with some slips",
    3: "Mostly accurate articulation",
    4: "Consistently precise pronunciation",
    5: "Native-level precision"
  },
  performance: {
    1: "Limited expression; needs guidance",
    2: "Developing expression and focus",
    3: "Shows focus with expressive reading",
    4: "Engaging and confident performance",
    5: "Captivating, actor-like performance"
  }
};

export default function TeacherVideoPage() {
  const BASE_CAMPUSES = ["International", "Andover", "Atheneum", "Platz"];
  const [role, setRole] = useState<string | null>(null);
  const [teacherClass, setTeacherClass] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [classCatalog, setClassCatalog] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [items, setItems] = useState<Homework[]>([]);
  const [classFilter, setClassFilter] = useState<string>("All");
  const [campusFilter, setCampusFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<"All" | "Today" | "Week" | "Overdue" | "Missing">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All");
  const [query, setQuery] = useState("");
  const [openVideoFor, setOpenVideoFor] = useState<Homework | null>(null);
  const [fb, setFb] = useState<Feedback>({
    overall_message: "",
    fluency: 0,
    volume: 0,
    speed: 0,
    pronunciation: 0,
    performance: 0,
    strengths: [],
    focus_point: "",
    next_try_guide: "",
    parent_report_message: "",
    average: 0,
    updatedAt: ""
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [attachments, setAttachments] = useState<{ name: string; size: number; type: string; url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiMode, setAiMode] = useState<"gentle" | "balanced" | "direct">("balanced");
  const overallMax = 140;
  const focusMax = 120;
  const guideMax = 120;

  

  

  

  useEffect(() => {
    const load = async () => {
      try {
        // 1. Teacher Profile Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: teacher } = await supabase
          .from("teachers")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();
        
        const tid = teacher?.id ? String(teacher.id) : null;
        setTeacherId(tid);

        if (!tid) {
          console.error("Teacher profile not found");
          return;
        }

        // 2. Fetch Dashboard Data
        const res = await fetch("/api/teacher/video-dashboard", { cache: "no-store" });
        const data = await res.json();
        
        const assigns: any[] = Array.isArray(data?.assignments) ? data.assignments : [];
        const flattened: Homework[] = assigns.flatMap(a => {
          const title = String(a.title || "");
          const due = String(a.due_date || "");
          const cls = String(a.class_name || "");
          const campus = String(a.campus || "");
          const aid = String(a.assignment_id || a.id || "");
          return (Array.isArray(a.students) ? a.students : []).map((s: any) => {
            const sid = String(s.student_id || "");
            const name = String(s.student_name || "");
            const eng = String(s.english_name || "");
            const submission = s.submission || null;
            const feedback = s.feedback || null;
            const ai = s.ai_evaluation || null;
            let status: Status = "미제출";
            if (submission && !feedback) status = "제출 완료";
            if (submission && feedback) status = "피드백 완료";
            let videoUrl: string | null = null;
            const vp = submission?.video_path || null;
            if (vp) {
              const pub = supabase.storage.from("student-videos").getPublicUrl(vp);
              videoUrl = pub?.data?.publicUrl || null;
            }
            return {
              id: `hw_${sid}_${aid}`,
              assignmentId: aid,
              studentId: sid,
              name,
              englishName: eng,
              className: cls,
              campus,
              title,
              dueDate: due,
              status,
              videoUrl,
              aiEval: ai
                ? {
                    scores: ai.scores,
                    average: ai.average,
                    pronunciation_flags: ai.pronunciation_flags || [],
                    teacher_feedback_draft: ai.teacher_feedback_draft || {
                      overall_message: "",
                      strengths: [],
                      focus_point: "",
                      next_try_guide: ""
                    },
                    parent_report_message: ai.parent_report_message || "",
                    needs_teacher_review: !!ai.needs_teacher_review,
                    ai_confidence: typeof ai.ai_confidence === "number" ? ai.ai_confidence : 0
                  }
                : null
            };
          });
        });
        setItems(flattened);
        const classes = Array.from(new Set(flattened.map(i => i.className)));
        setClassCatalog(classes);
      } catch {
        setItems([]);
        setClassCatalog([]);
      }
    };
    load();
  }, []);

  // Removed playback speed controls per requirement

  const classes = useMemo(() => {
    const base = new Set<string>([...classCatalog, ...items.map(i => i.className)]);
    const list = ["All", ...Array.from(base)];
    return list;
  }, [items, classCatalog]);
  const campuses = useMemo(() => {
    const base = new Set<string>([...BASE_CAMPUSES, ...items.map(i => i.campus)]);
    return ["All", ...Array.from(base)];
  }, [items]);

  const filtered = useMemo(() => {
    const checkDateFilter = (i: Homework) => {
      if (dateFilter === "All") return true;
      if (dateFilter === "Missing") return i.status === "미제출";

      const today = new Date();
      const dd = new Date(i.dueDate);
      if (dateFilter === "Today") {
        const s = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        return i.dueDate === s;
      }
      if (dateFilter === "Week") {
        const diff = Math.floor((dd.getTime() - today.getTime()) / 86400000);
        return diff >= 0 && diff <= 6;
      }
      if (dateFilter === "Overdue") {
        return dd.getTime() < today.getTime();
      }
      return true;
    };
    return items
      .filter(i => (classFilter === "All" ? true : i.className === classFilter))
      .filter(i => (campusFilter === "All" ? true : i.campus === campusFilter))
      .filter(i => checkDateFilter(i))
      .filter(i => (statusFilter === "All" ? true : i.status === statusFilter))
      .filter(i => (
        query.trim() === ""
          ? true
          : i.name.includes(query) ||
            i.englishName.toLowerCase().includes(query.toLowerCase()) ||
            i.title.toLowerCase().includes(query.toLowerCase())
      ))
      .sort((a, b) => {
        // Priority 1: Needs teacher review
        const aNeedsReview = a.aiEval?.needs_teacher_review ? 1 : 0;
        const bNeedsReview = b.aiEval?.needs_teacher_review ? 1 : 0;
        if (aNeedsReview !== bNeedsReview) return bNeedsReview - aNeedsReview;

        // Priority 2: Submitted but no feedback yet
        const aSubmitted = a.status === "제출 완료" ? 1 : 0;
        const bSubmitted = b.status === "제출 완료" ? 1 : 0;
        if (aSubmitted !== bSubmitted) return bSubmitted - aSubmitted;

        // Priority 3: Date (newest first)
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      });
  }, [items, classFilter, campusFilter, dateFilter, statusFilter, query]);

  const startFeedback = async (hw: Homework) => {
    setOpenVideoFor(hw);
    
    // Default empty state
    const emptyState: Feedback = {
      overall_message: "",
      fluency: 0,
      volume: 0,
      speed: 0,
      pronunciation: 0,
      performance: 0,
      strengths: [],
      focus_point: "",
      next_try_guide: "",
      parent_report_message: "",
      average: 0,
      updatedAt: ""
    };

    // If AI evaluation exists, pre-fill from AI draft
    if (hw.aiEval) {
      emptyState.fluency = hw.aiEval.scores.fluency;
      emptyState.volume = hw.aiEval.scores.volume;
      emptyState.speed = hw.aiEval.scores.speed;
      emptyState.pronunciation = hw.aiEval.scores.pronunciation;
      emptyState.performance = hw.aiEval.scores.performance;
      emptyState.average = hw.aiEval.average;
      
      emptyState.overall_message = hw.aiEval.teacher_feedback_draft.overall_message;
      emptyState.strengths = hw.aiEval.teacher_feedback_draft.strengths;
      emptyState.focus_point = hw.aiEval.teacher_feedback_draft.focus_point;
      emptyState.next_try_guide = hw.aiEval.teacher_feedback_draft.next_try_guide;
      emptyState.parent_report_message = hw.aiEval.parent_report_message;
    }

    setFb(emptyState);
    setAttachments([]);
    
    try {
      const url = `/api/teacher/video/feedback?studentId=${encodeURIComponent(hw.studentId)}&assignmentId=${encodeURIComponent(hw.assignmentId)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.item) {
          // If previous human feedback exists, it overrides AI draft
          setFb(data.item);
        }
      }
    } catch {}
  };

  const canSave = useMemo(() => {
    const keys = ["fluency", "volume", "speed", "pronunciation", "performance"] as const;
    const okScores = keys.every(k => fb[k] >= 1 && fb[k] <= 5);
    const okOverall = fb.overall_message.trim().length > 0;
    const okFocus = fb.focus_point.trim().length > 0;
    const okGuide = fb.next_try_guide.trim().length > 0;
    const okParent = fb.parent_report_message.trim().length > 0;
    return okScores && okOverall && okFocus && okGuide && okParent;
  }, [fb]);

  const saveFeedback = async () => {
    if (!openVideoFor || !canSave) return;
    const avg = Math.round(((fb.fluency + fb.volume + fb.speed + fb.pronunciation + fb.performance) / 5) * 10) / 10;
    const payload = { ...fb, average: avg, updatedAt: new Date().toISOString() };
    setSaving(true);
    setSaveToast("");
    try {
      const res = await fetch("/api/teacher/video/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: openVideoFor.studentId,
          assignmentId: openVideoFor.assignmentId,
          feedback: payload,
          attachments: attachments.map(a => ({ name: a.name, size: a.size, type: a.type }))
        })
      });
      if (!res.ok) throw new Error("save_failed");
      const list = items.map(i => (i.id === openVideoFor.id ? { ...i, status: "피드백 완료" as Status } : i));
      setItems(list);
      setSaveToast("저장되었습니다.");
    } catch {
      setSaveToast("저장에 실패했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setSaving(false);
    }
  };

  const draftAI = async () => {
    if (!openVideoFor) return;
    const scores = { fluency: fb.fluency, volume: fb.volume, speed: fb.speed, pronunciation: fb.pronunciation, performance: fb.performance };
    
    setIsGeneratingAI(true);
    try {
      const payload = {
        student_name: openVideoFor.englishName || openVideoFor.name,
        level: openVideoFor.className || "Kinder / G1",
        task_type: openVideoFor.title,
        scores,
        pronunciation_mistakes: openVideoFor.aiEval?.pronunciation_flags?.map(f => f.word) || [],
        reading_level: "early reader",
        tone: "warm, encouraging, teacher-like",
        constraints: { avoid_ai_words: true, max_sentences: 3 },
        mode: aiMode
      };

      const res = await fetch("/api/teacher/video/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("AI generation failed");
      const { data } = await res.json();
      
      setFb(prev => ({
        ...prev,
        overall_message: data.overall_message || "",
        strengths: data.strengths || [],
        focus_point: data.focus_point || "",
        next_try_guide: data.next_try_guide || "",
        parent_report_message: data.parent_report_message || ""
      }));
    } catch (err) {
      console.error(err);
      alert("AI Draft generation failed.");
    } finally {
      setIsGeneratingAI(false);
    }
  };
  const onAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    const next = files.map(f => ({ name: f.name, size: f.size, type: f.type, url: URL.createObjectURL(f) }));
    setAttachments(next);
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!openVideoFor) return;
    const f = e.target.files?.[0];
    if (!f) return;
    setItems(prev => prev.map(i => (i.id === openVideoFor.id ? { ...i, status: "제출 완료" as Status } : i)));
  };

  const enterFullscreen = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
  };

  const jumpTo = (t: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      videoRef.current.play();
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Video className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">Video Assignment Assessment</h1>
        </div>
        <Link href="/teacher/home" className="text-sm font-bold text-frage-blue">Home</Link>
      </div>

      {/* 1. Management Scope */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-slate-400" />
          <h3 className="font-bold text-slate-900 text-sm">Assessment Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Division (Class)</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Campus</label>
            <select
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {campuses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              <option value="All">All</option>
              <option value="Today">Today</option>
              <option value="Week">This Week</option>
              <option value="Overdue">Overdue</option>
              <option value="Missing">Missing</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              <option value="All">All</option>
              <option value="미제출">Missing</option>
              <option value="제출 완료">Submitted</option>
              <option value="피드백 완료">Feedback Done</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Student Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Assignment Records */}
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-slate-400" />
        <h2 className="text-lg font-bold text-slate-900">Assignments</h2>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed mb-8">
          <div className="flex justify-center mb-3">
            <Database className="w-12 h-12 text-slate-200" />
          </div>
          <div className="text-slate-500 font-medium mb-1">No assignments found.</div>
          <div className="text-xs text-slate-400 mb-4">There are no assignments matching your filters.</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(hw => (
          <div key={hw.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {hw.name} <span className="text-xs font-medium text-slate-500">({hw.englishName})</span>
                  </div>
                  <div className="text-xs font-bold text-slate-500">{hw.className} • {hw.campus}</div>
                </div>
                <div className="flex gap-2">
                  {hw.aiEval && (
                    <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                      hw.aiEval.needs_teacher_review
                        ? "bg-orange-100 text-orange-700 border-orange-200"
                        : "bg-indigo-100 text-indigo-700 border-indigo-200"
                    }`}>
                      {hw.aiEval.needs_teacher_review ? (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          교사 확인 필요
                        </>
                      ) : (
                        <>
                          <Bot className="w-3 h-3" />
                          AI 완료
                        </>
                      )}
                    </div>
                  )}
                  <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    hw.status === "미제출"
                      ? "bg-slate-100 text-slate-600 border-slate-200"
                      : hw.status === "제출 완료"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-green-100 text-green-700 border-green-200"
                  }`}>
                    {hw.status}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm text-slate-700">{hw.title}</div>
              {new Date() < new Date(hw.dueDate) ? (
                <span className="text-[10px] font-bold text-indigo-600">Active</span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400">Closed</span>
              )}
              <div className="mt-1 text-xs text-slate-500">Due {hw.dueDate}</div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => startFeedback(hw)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-frage-navy text-white hover:bg-frage-blue"
                >
                  <CheckCircle className="w-4 h-4" />
                  Write Feedback
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {openVideoFor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpenVideoFor(null)} />
          <div className="relative mt-6 mb-6 w-[92vw] max-w-[900px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <div className="font-bold text-slate-900 text-sm">
                {openVideoFor.name} <span className="text-xs font-medium text-slate-500">({openVideoFor.englishName})</span> • {openVideoFor.title}
              </div>
              <button onClick={() => setOpenVideoFor(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="aspect-video bg-black rounded-xl overflow-hidden">
                {openVideoFor.videoUrl ? (
                  <video ref={videoRef} src={openVideoFor.videoUrl} controls className="w-full h-full object-contain bg-black" playsInline />
                ) : (
                  <div className="text-white text-sm flex items-center justify-center h-full">No video submitted</div>
                )}
              </div>
              
              {openVideoFor.aiEval?.pronunciation_flags && openVideoFor.aiEval.pronunciation_flags.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                  <div className="text-xs font-bold text-orange-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    Pronunciation Check
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {openVideoFor.aiEval.pronunciation_flags.map((flag, idx) => (
                      <button
                        key={idx}
                        onClick={() => jumpTo(flag.time)}
                        className="px-2 py-1 bg-white border border-orange-200 rounded-lg text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors flex items-center gap-1"
                      >
                        <span>{flag.word}</span>
                        <span className="opacity-60 text-[10px]">{Math.floor(flag.time / 60)}:{String(Math.floor(flag.time % 60)).padStart(2, "0")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-4">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">[1] Overall Message</div>
                  <input
                    value={fb.overall_message}
                    onChange={(e) => setFb(prev => ({ ...prev, overall_message: e.target.value.slice(0, overallMax) }))}
                    placeholder="This was a confident and well-paced reading."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">{fb.overall_message.length}/{overallMax}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-2">[2] Score Table</div>
                  {(["fluency", "volume", "speed", "pronunciation", "performance"] as const).map((k) => (
                    <div key={k} className="flex items-center justify-between gap-3 py-2">
                      <div className="w-28 text-xs font-bold text-slate-700 capitalize">{k}</div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            onClick={() => setFb(prev => ({ ...prev, [k]: n }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              fb[k] === n ? "bg-frage-navy text-white border-frage-navy" : "bg-white text-slate-700 border-slate-200"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <div className="flex-1 text-right text-xs text-slate-500">{fb[k] ? scoreDesc[k][fb[k]] : ""}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">[3] Strength Highlight</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {strengthOptions.map(opt => {
                      const on = fb.strengths.includes(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() =>
                            setFb(prev => ({
                              ...prev,
                              strengths: on ? prev.strengths.filter(s => s !== opt) : [...prev.strengths, opt].slice(0, 2)
                            }))
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            on ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-700 border-slate-200"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    placeholder="Custom input"
                    value={fb.strengths.find(s => !strengthOptions.includes(s)) || ""}
                    onChange={(e) =>
                      setFb(prev => {
                        const fixed = prev.strengths.filter(s => strengthOptions.includes(s));
                        const custom = e.target.value.trim();
                        return { ...prev, strengths: custom ? [...fixed, custom].slice(0, 2) : fixed };
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">[4] One Focus Point</div>
                  <input
                    value={fb.focus_point}
                    onChange={(e) => setFb(prev => ({ ...prev, focus_point: e.target.value.slice(0, focusMax) }))}
                    placeholder="Focus on slowing down slightly at the end of sentences."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">{fb.focus_point.length}/{focusMax}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">[5] Next Try Guide</div>
                  <input
                    value={fb.next_try_guide}
                    onChange={(e) => setFb(prev => ({ ...prev, next_try_guide: e.target.value.slice(0, guideMax) }))}
                    placeholder="For the next video, pause for one second at each period."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">{fb.next_try_guide.length}/{guideMax}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">[6] Parent Report Message</div>
                  <textarea
                    value={fb.parent_report_message}
                    onChange={(e) => setFb(prev => ({ ...prev, parent_report_message: e.target.value }))}
                    placeholder="Message for parents (no AI mentions)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white h-24 resize-none"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">Attachments (optional)</div>
                  <input type="file" multiple accept="image/*" onChange={onAttachFiles} className="text-xs" />
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {attachments.map((a, i) => (
                        <div key={i} className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-200">
                          <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* AI Mode Selector */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-2">AI Draft Mode</div>
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    {(["gentle", "balanced", "direct"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setAiMode(m)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${
                          aiMode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={draftAI}
                    disabled={isGeneratingAI}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold ${
                      isGeneratingAI ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-slate-900 text-white"
                    }`}
                  >
                    {isGeneratingAI ? "Generating..." : "AI Draft"}
                  </button>
                  <button
                    onClick={saveFeedback}
                    disabled={!canSave || saving}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold ${
                      canSave && !saving ? "bg-frage-navy text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {saving ? "Saving..." : "Save & Notify"}
                  </button>
                </div>
                {saveToast && <div className="text-xs text-slate-600">{saveToast}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
