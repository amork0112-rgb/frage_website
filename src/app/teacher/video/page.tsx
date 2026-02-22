//app/teacher/video/page.tsx
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

type TeacherFeedback = {
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

type Status = "미제출" | "제출 완료" | "피드백 완료";
type Homework = {
  id: string; // assignment_key
  assignmentKey: string;
  studentId: string;
  name: string;
  englishName: string;
  className: string;
  campus: string;
  title: string;
  dueDate: string; // submission created_at
  status: Status;
  videoUrl?: string | null;
  aiEval?: AIEvaluation | null;
  teacherFeedback?: TeacherFeedback | null;
};

const strengthOptions = [
  "Clear pronunciation",
  "Steady pace",
  "Confident eye contact",
  "Expressive intonation",
  "Consistent eye tracking",
  "Well-managed punctuation pauses"
];
const scoreDesc: Record<keyof Omit<TeacherFeedback, "overall_message" | "strengths" | "focus_point" | "next_try_guide" | "parent_report_message" | "average" | "updatedAt">, Record<number, string>> = {
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
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [classCatalog, setClassCatalog] = useState<string[]>([]);
  const [items, setItems] = useState<Homework[]>([]);
  const [classFilter, setClassFilter] = useState<string>("All");
  const [campusFilter, setCampusFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<"All" | "Today" | "Week" | "Overdue" | "Missing">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All");
  const [query, setQuery] = useState("");
  const [openVideoFor, setOpenVideoFor] = useState<Homework | null>(null);
  const [fb, setFb] = useState<TeacherFeedback>({
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
        const res = await fetch("/api/teacher/video/primary/dashboard", { cache: "no-store" });
        const data = await res.json();
        
        const submissions: any[] = Array.isArray(data?.items) ? data.items : [];
        const flattened: Homework[] = submissions.map(sub => {
          const student = (sub.students as any)?.[0];
          const aiEvaluation = (sub.ai_evaluation as any)?.[0];
          const teacherFeedback = (sub.teacher_feedback as any)?.[0];

          let status: Status = "미제출";
          if (sub.status === "submitted" && !teacherFeedback) status = "제출 완료";
          if (sub.status === "submitted" && teacherFeedback) status = "피드백 완료";
          
          let videoUrl: string | null = null;
          if (sub.video_path) {
            const pub = supabase.storage.from("student-videos").getPublicUrl(sub.video_path);
            videoUrl = pub?.data?.publicUrl || null;
          }

          return {
            id: sub.assignment_key,
            assignmentKey: sub.assignment_key,
            studentId: student?.id,
            name: student?.name,
            englishName: student?.english_name,
            className: student?.class_name,
            campus: student?.campus,
            title: sub.title || "Video Assignment", // Assuming a default title or fetching from somewhere else
            dueDate: sub.created_at, // Using created_at as dueDate for now
            status,
            videoUrl,
            aiEval: aiEvaluation
              ? {
                  scores: {
                    fluency: aiEvaluation.fluency_score,
                    volume: aiEvaluation.volume_score,
                    speed: aiEvaluation.speed_score,
                    pronunciation: aiEvaluation.pronunciation_score,
                    performance: aiEvaluation.performance_score,
                  },
                  average: aiEvaluation.average_score,
                  pronunciation_flags: aiEvaluation.pronunciation_flags || [],
                  teacher_feedback_draft: {
                    overall_message: aiEvaluation.overall_message || "",
                    strengths: aiEvaluation.strengths || [],
                    focus_point: aiEvaluation.focus_point || "",
                    next_try_guide: aiEvaluation.next_try_guide || ""
                  },
                  parent_report_message: aiEvaluation.parent_report_message || "",
                  needs_teacher_review: !!aiEvaluation.needs_teacher_review,
                  ai_confidence: typeof aiEvaluation.ai_confidence === "number" ? aiEvaluation.ai_confidence : 0
                }
              : null,
            teacherFeedback: teacherFeedback
              ? {
                  overall_message: teacherFeedback.overall_message,
                  fluency: teacherFeedback.fluency,
                  volume: teacherFeedback.volume,
                  speed: teacherFeedback.speed,
                  pronunciation: teacherFeedback.pronunciation,
                  performance: teacherFeedback.performance,
                  strengths: teacherFeedback.strengths,
                  focus_point: teacherFeedback.focus_point,
                  next_try_guide: teacherFeedback.next_try_guide,
                  parent_report_message: teacherFeedback.parent_report_message,
                  average: teacherFeedback.average,
                  updatedAt: teacherFeedback.updated_at
                }
              : null,
          };
        });
        setItems(flattened);
        const classes = Array.from(new Set(flattened.map(i => i.className)));
        setClassCatalog(classes);
      } catch(e) {
        console.error("Failed to load dashboard data", e);
        setItems([]);
        setClassCatalog([]);
      }
    };
    load();
  }, []);

  const classes = useMemo(() => {
    const base = new Set<string>(items.map(i => i.className));
    const list = ["All", ...Array.from(base)];
    return list;
  }, [items]);

  const campuses = useMemo(() => {
    const base = new Set<string>([...BASE_CAMPUSES, ...items.map(i => i.campus)]);
    return ["All", ...Array.from(base)];
  }, [items]);

  const filtered = useMemo(() => {
    const checkDateFilter = (i: Homework) => {
      if (dateFilter === "All") return true;
      if (dateFilter === "Missing") return i.status === "미제출";

      const today = new Date();
      const itemDate = new Date(i.dueDate);
      
      // Normalize dates to start of day for comparison
      today.setHours(0, 0, 0, 0);
      itemDate.setHours(0, 0, 0, 0);

      if (dateFilter === "Today") {
        return itemDate.getTime() === today.getTime();
      }
      if (dateFilter === "Week") {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        
        return itemDate >= startOfWeek && itemDate <= endOfWeek;
      }
      if (dateFilter === "Overdue") {
        return itemDate < today && i.status !== "피드백 완료";
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
        // Priority 1: Needs teacher review (if AI eval exists and needs review)
        const aNeedsReview = a.aiEval?.needs_teacher_review && !a.teacherFeedback ? 1 : 0;
        const bNeedsReview = b.aiEval?.needs_teacher_review && !b.teacherFeedback ? 1 : 0;
        if (aNeedsReview !== bNeedsReview) return bNeedsReview - aNeedsReview;

        // Priority 2: Submitted but no feedback yet
        const aSubmittedNoFeedback = a.status === "제출 완료" && !a.teacherFeedback ? 1 : 0;
        const bSubmittedNoFeedback = b.status === "제출 완료" && !b.teacherFeedback ? 1 : 0;
        if (aSubmittedNoFeedback !== bSubmittedNoFeedback) return bSubmittedNoFeedback - aSubmittedNoFeedback;

        // Priority 3: Date (newest first based on submission date)
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      });
  }, [items, classFilter, campusFilter, dateFilter, statusFilter, query]);

  const startFeedback = async (hw: Homework) => {
    setOpenVideoFor(hw);
    
    // Default empty state
    const emptyState: TeacherFeedback = {
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

    // If previous human feedback exists, it overrides AI draft
    if (hw.teacherFeedback) {
      setFb(hw.teacherFeedback);
    } else {
      setFb(emptyState);
    }
    setAttachments([]);
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
          assignmentKey: openVideoFor.assignmentKey,
          feedback: payload,
          attachments: attachments.map(a => ({ name: a.name, size: a.size, type: a.type }))
        })
      });
      if (!res.ok) throw new Error("save_failed");
      const newTeacherFeedback: TeacherFeedback = {
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      const list = items.map(i => (i.id === openVideoFor.id ? { ...i, status: "피드백 완료" as Status, teacherFeedback: newTeacherFeedback } : i));
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
    // This part might need to be removed or adjusted depending on the new flow
    // setItems(prev => prev.map(i => (i.id === openVideoFor.id ? { ...i, status: "제출 완료" as Status } : i)));
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
          <div key={hw.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-slate-500">{hw.campus} - {hw.className}</div>
                <div className="text-xs font-bold text-slate-500">{new Date(hw.dueDate).toLocaleDateString()}</div>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">{hw.englishName || hw.name}</h3>
              <p className="text-sm text-slate-600 mb-4">{hw.title}</p>
              
              <div className="flex items-center gap-2">
                {hw.status === "미제출" && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-red-500 bg-red-50 rounded-full px-3 py-1">
                    <X className="w-4 h-4" /> Missing
                  </span>
                )}
                {hw.status === "제출 완료" && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-yellow-500 bg-yellow-50 rounded-full px-3 py-1">
                    <CheckCircle className="w-4 h-4" /> Submitted
                  </span>
                )}
                {hw.status === "피드백 완료" && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-green-500 bg-green-50 rounded-full px-3 py-1">
                    <CheckCircle className="w-4 h-4" /> Feedback Done
                  </span>
                )}
                {hw.aiEval?.needs_teacher_review && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-500 bg-blue-50 rounded-full px-3 py-1">
                    <Bot className="w-4 h-4" /> AI Review
                  </span>
                )}
                {hw.aiEval && typeof hw.aiEval.ai_confidence === "number" && hw.aiEval.ai_confidence < 0.7 && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-purple-500 bg-purple-50 rounded-full px-3 py-1">
                    <AlertCircle className="w-4 h-4" /> Low AI Confidence
                  </span>
                )}
              </div>
            </div>
            <div className="border-t border-slate-100 flex">
              <button
                onClick={() => startFeedback(hw)}
                className="flex-1 text-center py-3 text-sm font-bold text-frage-blue hover:bg-frage-blue hover:text-white transition-colors"
              >
                View & Assess
              </button>
            </div>
          </div>
        ))}
      </div>

      {openVideoFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <h2 className="text-xl font-black text-slate-900">
                Assessment for {openVideoFor.englishName || openVideoFor.name} - {openVideoFor.title}
              </h2>
              <button onClick={() => setOpenVideoFor(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2">
              <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-200">
                {openVideoFor.videoUrl ? (
                  <div className="mb-4">
                    <video ref={videoRef} src={openVideoFor.videoUrl} controls className="w-full rounded-xl bg-black" />
                    <button onClick={enterFullscreen} className="mt-2 text-frage-blue text-sm">Full Screen</button>
                  </div>
                ) : (
                  <div className="bg-slate-100 h-60 flex items-center justify-center rounded-xl mb-4">
                    <p className="text-slate-500">No video submitted.</p>
                  </div>
                )}

                {openVideoFor.aiEval?.pronunciation_flags && openVideoFor.aiEval.pronunciation_flags.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-bold text-slate-700 mb-2">Pronunciation Flags (AI)</h4>
                    <div className="flex flex-wrap gap-2">
                      {openVideoFor.aiEval.pronunciation_flags.map((flag, idx) => (
                        <span
                          key={idx}
                          onClick={() => jumpTo(flag.time)}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-red-200"
                        >
                          {flag.word} ({flag.time.toFixed(1)}s)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {openVideoFor.aiEval && (
                  <div className="p-4 bg-blue-50 rounded-lg mb-4">
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                      <Bot className="w-5 h-5" /> AI Draft Evaluation
                      {openVideoFor.aiEval.needs_teacher_review && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
                          Teacher Review Needed
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-blue-700 mb-2">"{openVideoFor.aiEval.teacher_feedback_draft.overall_message}"</p>
                    <p className="text-xs text-blue-600">Confidence: {(openVideoFor.aiEval.ai_confidence * 100).toFixed(0)}%</p>
                    <div className="mt-3 flex gap-2">
                      <select
                        value={aiMode}
                        onChange={(e) => setAiMode(e.target.value as any)}
                        className="px-3 py-1 rounded-lg border border-blue-200 text-sm bg-white text-blue-800"
                      >
                        <option value="gentle">Gentle</option>
                        <option value="balanced">Balanced</option>
                        <option value="direct">Direct</option>
                      </select>
                      <button
                        onClick={draftAI}
                        disabled={isGeneratingAI}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isGeneratingAI ? "Generating..." : "Regenerate AI Draft"}
                      </button>
                    </div>
                  </div>
                )}
                
                <h3 className="font-bold text-slate-700 mb-3">Teacher Feedback</h3>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Overall Message ({fb.overall_message.length}/{overallMax})</label>
                  <textarea
                    value={fb.overall_message}
                    onChange={(e) => setFb(prev => ({ ...prev, overall_message: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    rows={3}
                    maxLength={overallMax}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {Object.entries(scoreDesc).map(([key, descriptions]) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-slate-500 mb-1 capitalize">
                        {key} ({fb[key as keyof Omit<TeacherFeedback, "overall_message" | "strengths" | "focus_point" | "next_try_guide" | "parent_report_message" | "average" | "updatedAt">]})
                      </label>
                      <select
                        value={fb[key as keyof Omit<TeacherFeedback, "overall_message" | "strengths" | "focus_point" | "next_try_guide" | "parent_report_message" | "average" | "updatedAt">]}
                        onChange={(e) => setFb(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                      >
                        {[1, 2, 3, 4, 5].map(score => (
                          <option key={score} value={score}>
                            {score} - {descriptions[score]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Strengths (Select up to 3)</label>
                  <div className="flex flex-wrap gap-2">
                    {strengthOptions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setFb(prev => {
                            const newStrengths = prev.strengths.includes(s)
                              ? prev.strengths.filter(item => item !== s)
                              : [...prev.strengths, s].slice(0, 3);
                            return { ...prev, strengths: newStrengths };
                          });
                        }}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          fb.strengths.includes(s)
                            ? "bg-green-500 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Focus Point ({fb.focus_point.length}/{focusMax})</label>
                  <textarea
                    value={fb.focus_point}
                    onChange={(e) => setFb(prev => ({ ...prev, focus_point: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    rows={2}
                    maxLength={focusMax}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Next Try Guide ({fb.next_try_guide.length}/{guideMax})</label>
                  <textarea
                    value={fb.next_try_guide}
                    onChange={(e) => setFb(prev => ({ ...prev, next_try_guide: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    rows={2}
                    maxLength={guideMax}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Parent Report Message</label>
                  <textarea
                    value={fb.parent_report_message}
                    onChange={(e) => setFb(prev => ({ ...prev, parent_report_message: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    rows={3}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Attachments (Optional)</label>
                  <input type="file" multiple onChange={onAttachFiles} className="text-sm" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachments.map((file, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={saveFeedback}
                  disabled={!canSave || saving}
                  className="w-full px-4 py-3 bg-frage-blue text-white font-bold rounded-lg hover:bg-frage-blue-dark disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save Feedback"}
                </button>
                {saveToast && <p className="text-center mt-2 text-sm text-green-600">{saveToast}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}