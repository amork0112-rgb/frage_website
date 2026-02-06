//app/teacher/video-management/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Search, Filter, CheckCircle, Clock, AlertCircle, Video, Star, ChevronRight, X, Save } from "lucide-react";

// This page assumes manual (Kinder-style) assignments only.

type Assignment = {
  id: string;
  title: string;
  module: string;
  due_date: string;
  release_at: string;
  class_name: string;
  campus?: string;
};

type Student = {
  id: string;
  name: string;
  english_name?: string;
  class_name: string;
};

type Submission = {
  id: string;
  student_id: string;
  video_path: string;
  status: string;
  created_at: string;
  video_url?: string; // signed url
};

type Feedback = {
  id?: string;
  assignment_id: string;
  student_id: string;
  overall_message: string;
  strengths: string[];
  focus_point: string;
  next_try_guide: string;
  fluency: number;
  volume: number;
  speed: number;
  pronunciation: number;
  performance: number;
};

type StudentRow = {
  student: Student;
  submission?: Submission;
  feedback?: Feedback;
  status: "Missing" | "Submitted" | "Reviewed";
};

export default function AssignmentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Missing" | "Submitted" | "Reviewed">("All");

  // Grading State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [gradingFeedback, setGradingFeedback] = useState<Feedback>({
    assignment_id: id,
    student_id: "",
    overall_message: "",
    strengths: [],
    focus_point: "",
    next_try_guide: "",
    fluency: 3,
    volume: 3,
    speed: 3,
    pronunciation: 3,
    performance: 3,
  });
  const [savingFeedback, setSavingFeedback] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Assignment
      const { data: assignData, error: assignError } = await supabase
        .from("video_assignments")
        .select("*")
        .eq("id", id)
        .single();
      
      if (assignError || !assignData) throw new Error("Assignment not found");
      setAssignment(assignData);

      // 2. Fetch Students via API
      // We fetch all students (or a large page) and filter locally
      // because we need to match by class_name string
      // NOTE: This page is used only for manually created assignments (Kinder). 
      // Primary assignments must NOT rely on this page. 
      const resStudents = await fetch("/api/teacher/students?pageSize=1000");
      const payloadStudents = await resStudents.json();
      const allStudents = Array.isArray(payloadStudents.items) ? payloadStudents.items : [];

      let filteredStudents = allStudents;
      
      // Filter by Class Name
      if (assignData.class_name && assignData.class_name !== "All") {
        filteredStudents = filteredStudents.filter((s: any) => 
          (s.className === assignData.class_name) || 
          (s.class_name === assignData.class_name) // check both just in case
        );
      }
      
      // Filter by Campus
      if (assignData.campus && assignData.campus !== "All") {
        filteredStudents = filteredStudents.filter((s: any) => s.campus === assignData.campus);
      }
      
      const students: Student[] = filteredStudents.map((s: any) => ({
        id: s.id || s.student_id, // API might return different fields
        name: s.name || s.student_name,
        english_name: s.englishName || s.english_first_name,
        class_name: s.className || s.class_name || "Unknown",
      })).sort((a: any, b: any) => a.name.localeCompare(b.name));

      // 3. Fetch Submissions & Feedback via API
      const resSubs = await fetch(`/api/teacher/video-submissions?assignmentId=${id}`);
      const payloadSubs = await resSubs.json();
      
      const submissions: Submission[] = payloadSubs.submissions || [];
      const feedbacks: Feedback[] = payloadSubs.feedback || [];

      // 5. Merge
      const merged: StudentRow[] = students.map(student => {
        const sub = submissions.find(s => s.student_id === student.id);
        const feed = feedbacks.find(f => f.student_id === student.id);
        
        let status: "Missing" | "Submitted" | "Reviewed" = "Missing";
        if (sub) status = "Submitted";
        if (feed) status = "Reviewed";

        return {
          student,
          submission: sub,
          feedback: feed,
          status
        };
      });

      setRows(merged);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        row.student.name.toLowerCase().includes(q) || 
        (row.student.english_name || "").toLowerCase().includes(q);
      
      // Filter
      const matchFilter = statusFilter === "All" || row.status === statusFilter;

      return matchSearch && matchFilter;
    });
  }, [rows, searchQuery, statusFilter]);

  const openGrading = async (row: StudentRow) => {
    setSelectedStudentId(row.student.id);
    
    // Reset or Load Feedback
    if (row.feedback) {
      setGradingFeedback({ ...row.feedback });
    } else {
      setGradingFeedback({
        assignment_id: id,
        student_id: row.student.id,
        overall_message: "",
        strengths: [],
        focus_point: "",
        next_try_guide: "",
        fluency: 3,
        volume: 3,
        speed: 3,
        pronunciation: 3,
        performance: 3,
      });
    }

    // Load Video URL if submitted
    if (row.submission?.video_path) {
      try {
        const res = await fetch(`/api/teacher/video-signed-url?path=${encodeURIComponent(row.submission.video_path)}`);
        const data = await res.json();
        setCurrentVideoUrl(data.signedUrl || null);
      } catch (e) {
        console.error("Error signing video URL", e);
        setCurrentVideoUrl(null);
      }
    } else {
      setCurrentVideoUrl(null);
    }
  };

  const closeGrading = () => {
    setSelectedStudentId(null);
    setCurrentVideoUrl(null);
  };

  const saveFeedback = async () => {
    if (!selectedStudentId) return;
    setSavingFeedback(true);
    try {
      const res = await fetch("/api/teacher/video-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gradingFeedback),
      });

      if (!res.ok) throw new Error("Failed to save");

      // Update local state
      await loadData(); // Reload to refresh statuses
      closeGrading();
      alert("Feedback saved successfully!");

    } catch (err) {
      alert("Failed to save feedback");
      console.error(err);
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleScoreChange = (field: keyof Feedback, value: number) => {
    setGradingFeedback(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-8 flex justify-center text-slate-500">Loading assignment details...</div>;
  if (!assignment) return <div className="p-8 flex justify-center text-slate-500">Assignment not found</div>;

  const selectedRow = rows.find(r => r.student.id === selectedStudentId);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">{assignment.title}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{assignment.class_name}</span>
            <span>Module: {assignment.module}</span>
            <span>Due: {assignment.due_date}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Left: Student List */}
        <div className={`flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${selectedStudentId ? 'hidden lg:flex lg:w-1/3 lg:flex-none' : ''}`}>
          
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..." 
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex gap-2">
              {(["All", "Missing", "Submitted", "Reviewed"] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                    statusFilter === status 
                      ? 'bg-slate-800 text-white border-slate-800' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filteredRows.map(row => (
              <button
                key={row.student.id}
                onClick={() => openGrading(row)}
                className={`w-full flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left ${selectedStudentId === row.student.id ? 'bg-blue-50 border-blue-100' : ''}`}
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">{row.student.name}</div>
                  {row.student.english_name && <div className="text-xs text-slate-500">{row.student.english_name}</div>}
                </div>
                <div className="flex items-center gap-3">
                  {row.status === "Reviewed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {row.status === "Submitted" && <Clock className="w-5 h-5 text-yellow-500" />}
                  {row.status === "Missing" && <AlertCircle className="w-5 h-5 text-slate-200" />}
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            ))}
            {filteredRows.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No students found.</div>
            )}
          </div>
        </div>

        {/* Right: Grading Panel */}
        {selectedStudentId && selectedRow ? (
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-fade-in">
            {/* Grading Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="font-bold text-slate-900">{selectedRow.student.name}</h2>
                <div className="text-xs text-slate-500">{selectedRow.status}</div>
              </div>
              <button onClick={closeGrading} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 lg:hidden">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Video Player */}
              <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center relative shadow-inner">
                {selectedRow.status === "Missing" ? (
                  <div className="text-slate-500 flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8 opacity-50" />
                    <span className="text-sm font-medium">Not submitted yet</span>
                  </div>
                ) : currentVideoUrl ? (
                  <video src={currentVideoUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <div className="text-white flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading Video...
                  </div>
                )}
              </div>

              {/* Feedback Form */}
              <div className="space-y-6 max-w-2xl mx-auto">
                
                {/* Scores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {(["fluency", "volume", "speed", "pronunciation", "performance"] as const).map(metric => (
                     <div key={metric} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{metric}</label>
                       <div className="flex gap-1">
                         {[1, 2, 3, 4, 5].map(score => (
                           <button
                             key={score}
                             onClick={() => handleScoreChange(metric, score)}
                             className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                               (gradingFeedback[metric] as number) === score 
                                 ? 'bg-frage-blue text-white shadow-sm' 
                                 : 'bg-white text-slate-400 hover:bg-slate-200'
                             }`}
                           >
                             {score}
                           </button>
                         ))}
                       </div>
                     </div>
                   ))}
                </div>

                {/* Text Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Overall Message</label>
                    <textarea 
                      value={gradingFeedback.overall_message}
                      onChange={e => setGradingFeedback(prev => ({ ...prev, overall_message: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-frage-blue focus:ring-1 focus:ring-frage-blue outline-none transition-all"
                      rows={3}
                      placeholder="Great job! Keep it up."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Focus Point</label>
                      <input 
                        value={gradingFeedback.focus_point}
                        onChange={e => setGradingFeedback(prev => ({ ...prev, focus_point: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-frage-blue outline-none"
                        placeholder="e.g. Watch your pauses"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Next Try Guide</label>
                      <input 
                        value={gradingFeedback.next_try_guide}
                        onChange={e => setGradingFeedback(prev => ({ ...prev, next_try_guide: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-frage-blue outline-none"
                        placeholder="e.g. Read slowly"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Strengths (comma separated)</label>
                    <input 
                      value={gradingFeedback.strengths.join(", ")}
                      onChange={e => setGradingFeedback(prev => ({ ...prev, strengths: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-frage-blue outline-none"
                      placeholder="Good volume, Clear pronunciation"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button 
                onClick={closeGrading}
                className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveFeedback}
                disabled={savingFeedback || selectedRow.status === "Missing"}
                className="px-6 py-2 rounded-lg font-bold bg-frage-navy text-white hover:bg-frage-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingFeedback ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Feedback
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 bg-slate-50 rounded-2xl border border-slate-200 border-dashed items-center justify-center text-slate-400 flex-col gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Star className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-medium">Select a student to view submission and grade</p>
          </div>
        )}

      </div>
    </main>
  );
}
