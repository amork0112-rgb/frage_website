"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Video, Upload, CheckCircle, RefreshCw, Star, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function VideoHomeworkPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const initialStatus = searchParams?.get("status") || "Pending";

  const [homeworkData, setHomeworkData] = useState<{
    id: string;
    subject: string;
    module_code: string;
    due_date: string;
    status: "Pending" | "Submitted" | "Reviewed" | string;
    feedback: {
      overall_message: string;
      fluency_score: string;
      volume_score: string;
      speed_score: string;
      pronunciation_score: string;
      performance_score: string;
      strengths: string[];
      focus_point: string;
      next_try_guide: string;
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
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      stopCamera();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulating API
    setIsSubmitting(false);
    try {
      const parts = String(params.id || "").split("_");
      const studentId = parts[1] || localStorage.getItem("portal_student_id") || "s8";
      if (videoUrl) {
        localStorage.setItem(`student_video_${studentId}`, videoUrl);
      }
    } catch {}
    setHomeworkData(prev => ({ ...prev, status: "Submitted" }));
  };

  useEffect(() => {
    try {
      const parts = String(params.id || "").split("_");
      const studentId = parts[1] || localStorage.getItem("portal_student_id") || "s8";
      const dueDate = parts[2] || "";
      const raw = localStorage.getItem("video_assignments");
      const arr: { title: string; module: string; dueDate: string }[] = raw ? JSON.parse(raw) : [];
      const match = (Array.isArray(arr) ? arr : []).find(a => a.dueDate === dueDate) || null;
      let status: "Pending" | "Submitted" | "Reviewed" | string = initialStatus as any;
      let fb: any = null;
      try {
        const fbKey = `teacher_video_feedback_${studentId}_${dueDate}`;
        const rawFb = localStorage.getItem(fbKey);
        if (rawFb) {
          const data = JSON.parse(rawFb);
          status = "Reviewed";
          fb = {
            overall_message: String(data.overall_message || ""),
            fluency_score: Number(data.fluency || 0) >= 4 ? "Excellent" : Number(data.fluency || 0) === 3 ? "Appropriate" : Number(data.fluency || 0) === 2 ? "Developing" : "Needs Support",
            volume_score: Number(data.volume || 0) >= 4 ? "Strong" : Number(data.volume || 0) === 3 ? "Clear" : Number(data.volume || 0) === 2 ? "Developing" : "Needs Support",
            speed_score: Number(data.speed || 0) >= 4 ? "Natural" : Number(data.speed || 0) === 3 ? "Appropriate" : Number(data.speed || 0) === 2 ? "Developing" : "Too Slow",
            pronunciation_score: Number(data.pronunciation || 0) >= 4 ? "Consistently Precise" : Number(data.pronunciation || 0) === 3 ? "Mostly Accurate" : Number(data.pronunciation || 0) === 2 ? "Developing" : "Needs Support",
            performance_score: Number(data.performance || 0) >= 4 ? "Engaging" : Number(data.performance || 0) === 3 ? "Focused" : Number(data.performance || 0) === 2 ? "Developing" : "Needs Support",
            strengths: Array.isArray(data.strengths) ? data.strengths : [],
            focus_point: String(data.focus_point || ""),
            next_try_guide: String(data.next_try_guide || "")
          };
        } else {
          const url = localStorage.getItem(`student_video_${studentId}`);
          if (url) status = "Submitted";
        }
      } catch {}
      setHomeworkData({
        id: params.id,
        subject: String(match?.title || ""),
        module_code: String(match?.module || ""),
        due_date: String(match?.dueDate || ""),
        status,
        feedback: fb
      });
    } catch {}
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- Render: Feedback View (Reviewed) ---
  if (homeworkData.status === "Reviewed" && homeworkData.feedback) {
    const { feedback } = homeworkData;
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-20">
        <header className="px-4 py-4 flex items-center gap-4 bg-white border-b border-slate-200">
          <Link href="/portal/home" className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
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
                <p className="text-xs text-slate-500">From Ms. Anna</p>
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

          {/* [5] View Reading Details (Collapsed Score Table) */}
          <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-bold text-sm text-slate-500 uppercase tracking-wider">
                View Reading Details
              </span>
              {showDetails ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            {showDetails && (
              <div className="divide-y divide-slate-50 animate-fade-in-down">
                {[
                  { label: "Fluency", value: feedback.fluency_score },
                  { label: "Volume", value: feedback.volume_score },
                  { label: "Speed", value: feedback.speed_score },
                  { label: "Pronunciation", value: feedback.pronunciation_score },
                  { label: "Performance", value: feedback.performance_score },
                ].map((item, idx) => (
                  <div key={idx} className="px-6 py-4 flex justify-between items-center">
                    <span className="font-medium text-slate-600">{item.label}</span>
                    <span className="font-bold text-frage-blue">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Link href="/portal/home" className="block w-full py-4 bg-slate-800 text-white font-bold text-center rounded-xl">
            Back to Home
          </Link>
        </main>
      </div>
    );
  }

  // --- Render: Submitted View ---
  if (homeworkData.status === "Submitted") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-fade-in-up">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Video Submitted</h1>
        <p className="text-slate-500 mb-8 font-medium">Waiting for teacher review</p>
        
        <Link href="/portal/home" className="px-8 py-3 bg-frage-navy text-white rounded-xl font-bold hover:bg-frage-blue transition-colors shadow-lg shadow-frage-navy/20">
          Back to Home
        </Link>
        
        {/* Dev Helper: Toggle to Reviewed State */}
        <button 
          onClick={() => setHomeworkData({
            ...homeworkData, 
            status: "Reviewed",
            feedback: {
              overall_message: "Clear effort and steady reading today.",
              fluency_score: "Developing",
              volume_score: "Clear",
              speed_score: "Appropriate",
              pronunciation_score: "Mostly Accurate",
              performance_score: "Focused",
              strengths: ["Clear voice throughout the reading", "Good focus from start to finish"],
              focus_point: "Try to read without pausing mid-sentence.",
              next_try_guide: "Read one page slowly while keeping your eyes on the text."
            }
          })}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-300 hover:text-slate-500"
        >
          [Dev: Simulate Teacher Feedback]
        </button>
      </div>
    );
  }

  // --- Render: Recording View (Pending) ---
  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between z-10">
        <Link href="/portal/home" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-6 h-6 text-white" />
        </Link>
        <span className="font-bold text-sm tracking-widest uppercase text-white/70">Video Homework</span>
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 relative pb-10">
        
        {/* [1] Video Task Summary (Fixed Card) */}
        {!isRecording && !videoUrl && (
          <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8 animate-fade-in text-center">
            <h2 className="text-xs font-bold text-frage-blue uppercase tracking-wider mb-2">Today&apos;s Reading Video</h2>
            <h1 className="text-2xl font-bold text-white mb-1">{homeworkData.subject}</h1>
            <div className="flex items-center justify-center gap-3 text-sm font-medium text-white/60 mb-4">
              <span>{homeworkData.module_code}</span>
              <span className="w-1 h-1 rounded-full bg-white/30"></span>
              <span>Due: {homeworkData.due_date}</span>
            </div>
            <p className="text-white/80 text-sm bg-white/5 rounded-lg py-2 px-4 inline-block">
              Please record your child reading the assigned text.
            </p>
          </div>
        )}

        {/* [2] Record / Upload Area */}
        <div className="w-full max-w-md aspect-[3/4] bg-slate-900 rounded-3xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl transition-all">
          
          {videoUrl ? (
            // Preview
            <video src={videoUrl} controls className="w-full h-full object-cover" playsInline />
          ) : (
            // Camera / Initial State
            <>
              {cameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
              ) : (
                <div className="flex flex-col items-center gap-6 p-6 text-center w-full">
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center shadow-inner">
                    <Video className="w-8 h-8 text-slate-500" />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-3 w-full max-w-[240px]">
                    <button 
                      onClick={startCamera}
                      className="w-full py-3.5 bg-frage-blue hover:bg-frage-navy text-white rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-frage-blue/20"
                    >
                      <Video className="w-5 h-5" />
                      Record Video
                    </button>
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white/90 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 border border-white/5"
                    >
                      <Upload className="w-5 h-5" />
                      Upload Video
                    </button>
                    <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                  </div>

                  {/* Helper Text (Anxiety Reduction) */}
                  <div className="space-y-1.5 text-xs text-white/40 font-medium">
                    <p>• Short videos are enough</p>
                    <p>• A quiet place is recommended</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Recording Timer */}
          {isRecording && (
             <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-red-600/90 px-4 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md animate-pulse z-20 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="font-mono font-bold text-sm tracking-widest">{formatTime(recordingTime)}</span>
             </div>
          )}
        </div>

        {/* Controls (Bottom) */}
        <div className="w-full max-w-md mt-6 flex flex-col gap-4 min-h-[80px] justify-center">
            
            {/* Recording: Stop */}
            {isRecording && (
                <div className="flex justify-center items-center animate-fade-in-up">
                    <button 
                        onClick={stopRecording}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative hover:bg-white/10 transition-colors"
                    >
                        <div className="w-8 h-8 bg-red-500 rounded-md"></div>
                    </button>
                </div>
            )}
            
            {/* Camera Active (Not Recording): Start / Back */}
            {cameraActive && !isRecording && (
                <div className="flex justify-center items-center gap-8 animate-fade-in-up">
                    <button 
                        onClick={() => stopCamera()}
                        className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors border border-white/10"
                    >
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </button>

                    <button 
                        onClick={startRecording}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group transition-all"
                    >
                        <div className="w-16 h-16 bg-red-500 rounded-full group-hover:scale-95 transition-transform"></div>
                    </button>
                    <div className="w-14"></div>
                </div>
            )}

            {/* [3] Submission Status & Actions */}
            {videoUrl && (
                <div className="flex flex-col gap-3 animate-fade-in-up">
                    <div className="text-center mb-2">
                       <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
                         Video Ready to Submit
                       </span>
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-frage-blue text-white rounded-xl font-bold text-lg hover:bg-frage-navy transition-colors flex items-center justify-center gap-2 shadow-lg shadow-frage-blue/20 disabled:opacity-50"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Video"}
                    </button>
                    
                    <button 
                        onClick={() => {
                            setVideoUrl(null);
                            setCameraActive(false); 
                        }}
                        className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retake / Re-upload
                    </button>
                </div>
            )}
        </div>

      </main>
    </div>
  );
}
