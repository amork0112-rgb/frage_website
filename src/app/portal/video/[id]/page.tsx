"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Video, Upload, CheckCircle, RefreshCw, Star, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function VideoHomeworkPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStatus = searchParams?.get("status") || "Pending";
  const queryStudentId = searchParams?.get("studentId");

  const [studentId, setStudentId] = useState<string | null>(queryStudentId || null);
  
  const [homeworkData, setHomeworkData] = useState<{
    id: string;
    subject: string;
    module_code: string;
    due_date: string;
    status: "Pending" | "Submitted" | "Reviewed" | string;
    feedback: {
      overall_message: string;
      strengths: string[];
      focus_point: string;
      next_try_guide: string;
      details?: Record<string, string>;
    } | null;
  }>({
    id: params.id,
    subject: "",
    module_code: "",
    due_date: "",
    status: initialStatus as any,
    feedback: null
  });

  // State
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoPath, setVideoPath] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastBlobRef = useRef<Blob | File | null>(null);

  // --- Initialization ---
  useEffect(() => {
    (async () => {
      try {
        let currentStudentId = studentId;

        // 1. Resolve Student ID if missing
        if (!currentStudentId) {
          const homeRes = await fetch("/api/portal/home", { cache: "no-store" });
          const homePayload = await homeRes.json();
          const students = Array.isArray(homePayload?.students) ? homePayload.students : [];
          const firstEnrolled = students.find((s: any) => s.type === "enrolled") || students[0] || null;
          if (firstEnrolled && firstEnrolled.id) {
            currentStudentId = String(firstEnrolled.id);
            setStudentId(currentStudentId);
          } else {
            setLoading(false);
            return;
          }
        }

        // 2. Fetch Assignment Details via API
        const res = await fetch(`/api/portal/video?studentId=${currentStudentId}&assignmentId=${params.id}`);
        const data = await res.json();
        const item = data.items && data.items.length > 0 ? data.items[0] : null;

        if (!item) {
          console.error("Assignment not found");
          setLoading(false);
          return;
        }

        // 3. Set State
        setVideoPath(item.videoPath || null);
        setVideoUrl(item.videoUrl || null);
        
        setHomeworkData({
          id: String(item.id),
          subject: item.title,
          module_code: item.module,
          due_date: item.dueDate,
          status: item.status,
          feedback: item.feedback
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [params.id, studentId]);


  // --- Camera & Recording Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" }, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera access is required to record video.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      lastBlobRef.current = blob;
      stopCamera();
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 180) { // 3 minutes limit
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 150 * 1024 * 1024) { // 150MB limit
        alert("File size exceeds 150MB limit.");
        return;
      }
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      lastBlobRef.current = file;
      stopCamera();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!lastBlobRef.current) {
      alert("No video to submit.");
      return;
    }
    if (!studentId) {
      alert("Student ID not found. Please try refreshing.");
      return;
    }

    setIsSubmitting(true);
    try {
      const assignmentId = params.id;
      const file =
        lastBlobRef.current instanceof File
          ? lastBlobRef.current
          : new File([lastBlobRef.current], `${assignmentId}.webm`, { type: "video/webm" });
      
      const storagePath = `${studentId}/${assignmentId}.webm`;
      
      const { error: upErr } = await supabase.storage
        .from("student-videos")
        .upload(storagePath, file, { upsert: true });
      
      if (upErr) throw upErr;

      // Check if submission exists
      const { data: exists } = await supabase
        .from("portal_video_submissions")
        .select("*")
        .eq("student_id", studentId)
        .eq("assignment_id", assignmentId)
        .limit(1);

      if (Array.isArray(exists) && exists.length > 0) {
        await supabase
          .from("portal_video_submissions")
          .update({ 
            video_path: storagePath, 
            status: "submitted",
            updated_at: new Date().toISOString()
          })
          .eq("student_id", studentId)
          .eq("assignment_id", assignmentId);
      } else {
        await supabase
          .from("portal_video_submissions")
          .insert({ 
            student_id: studentId, 
            assignment_id: assignmentId, 
            video_path: storagePath, 
            status: "submitted" 
          });
      }

      setVideoPath(storagePath);
      // We can rely on the uploaded file's local URL for now, or fetch a signed one.
      // For simplicity, we just keep the current view.
      setHomeworkData(prev => ({ ...prev, status: "Submitted" }));
      alert("Submitted successfully!");

    } catch (err) {
      console.error(err);
      alert("Error submitting video.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading assignment...</div>;
  }

  // --- Render: Feedback View (Reviewed) ---
  if (homeworkData.status === "Reviewed" && homeworkData.feedback) {
    const { feedback } = homeworkData;
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-20">
        <header className="px-4 py-4 flex items-center gap-4 bg-white border-b border-slate-200">
          <Link href="/portal/video" className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="font-bold text-lg text-slate-800">Review & Feedback</h1>
        </header>
        
        <main className="px-4 py-6 max-w-md mx-auto space-y-6">
          {/* [1] Overall Message */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-frage-blue">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Teacher Feedback</h2>
                <p className="text-xs text-slate-500">From Teacher</p>
              </div>
            </div>
            <p className="text-xl font-bold text-frage-navy leading-relaxed">
              {feedback.overall_message}
            </p>
          </section>

          {/* [2, 3, 4] Highlights */}
          <section className="space-y-4">
            {/* [2] Strength Highlight */}
            <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
               <h3 className="font-bold text-green-700 text-sm mb-2 flex items-center gap-2">
                 <Star className="w-4 h-4 fill-current" /> Strength Highlight
               </h3>
               <ul className="space-y-2">
                 {feedback.strengths.map((str: string, i: number) => (
                   <li key={i} className="text-sm font-medium text-green-800 flex items-start gap-2">
                     <span className="mt-1.5 w-1 h-1 rounded-full bg-green-500"></span>
                     {str}
                   </li>
                 ))}
               </ul>
            </div>
            
            {/* [3] One Focus Point */}
            <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
               <h3 className="font-bold text-orange-700 text-sm mb-2">💡 One Focus Point</h3>
               <p className="text-sm font-medium text-orange-800">
                 {feedback.focus_point}
               </p>
            </div>

            {/* [4] Next Try Guide */}
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
               <h3 className="font-bold text-blue-700 text-sm mb-2">🚀 Next Try Guide</h3>
               <p className="text-sm font-medium text-blue-800">
                 {feedback.next_try_guide}
               </p>
            </div>
          </section>

          {/* [5] Details (Table) - Added for consistency */}
          {feedback.details && (
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase">Evaluation Details</span>
              </div>
              <div className="divide-y divide-slate-50">
                {Object.entries(feedback.details).map(([key, value]) => (
                  <div key={key} className="px-5 py-3 flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">{key}</span>
                    <span className="font-bold text-frage-blue">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Submitted Video Review */}
          {videoUrl && (
             <section className="bg-white rounded-2xl p-4 border border-slate-200">
               <h3 className="font-bold text-slate-700 text-sm mb-3">Submitted Video</h3>
               <video src={videoUrl} controls className="w-full rounded-lg bg-black aspect-video" />
             </section>
          )}
        </main>
      </div>
    );
  }

  // --- Render: Submission View (Pending / Submitted) ---
  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex items-center gap-4 border-b border-slate-100">
        <Link href="/portal/video" className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-bold text-lg text-slate-800">
          {homeworkData.status === "Submitted" ? "Submitted" : "Submit Video"}
        </h1>
      </header>

      <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full">
        {/* Assignment Info */}
        <div className="mb-6">
          <span className="inline-block bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded mb-2">
            {homeworkData.module_code}
          </span>
          <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">
            {homeworkData.subject}
          </h2>
          <p className="text-slate-500 text-sm">
            Due: {homeworkData.due_date}
          </p>
        </div>

        {/* Video Area */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden relative shadow-lg ring-1 ring-black/5">
            {videoUrl ? (
              <video 
                src={videoUrl} 
                controls 
                className="w-full h-full object-cover" 
              />
            ) : cameraActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform scale-x-[-1]" 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                  <Video className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium">Ready to record</p>
              </div>
            )}

            {/* Recording Timer Overlay */}
            {isRecording && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse flex items-center gap-2 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                {formatTime(recordingTime)}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-auto pb-8 space-y-3">
            {!videoUrl ? (
              !cameraActive ? (
                <>
                  <button 
                    onClick={startCamera}
                    className="w-full py-4 rounded-xl bg-frage-blue text-white font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Video className="w-5 h-5" />
                    Start Camera
                  </button>
                  <div className="text-center">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">or</span>
                  </div>
                  <label className="block w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-bold text-center hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer">
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5" />
                      Upload Video File
                    </div>
                  </label>
                </>
              ) : (
                !isRecording ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={stopCamera}
                      className="py-4 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={startRecording}
                      className="py-4 rounded-xl bg-red-500 text-white font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                      Record
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={stopRecording}
                    className="w-full py-4 rounded-xl bg-white border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                    Stop Recording
                  </button>
                )
              )
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      setVideoUrl(null);
                      setVideoPath(null);
                      lastBlobRef.current = null;
                      if (!cameraActive) startCamera();
                    }}
                    className="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retake
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="py-3 rounded-xl bg-frage-blue text-white font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isSubmitting ? "Submitting..." : "Submit Video"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
