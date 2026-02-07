"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, FileText, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ClassItem {
  id: string;
  name: string;
}

interface NewNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  onSuccess: () => void;
}

export default function NewNoticeModal({ isOpen, onClose, classes, onSuccess }: NewNoticeModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [classId, setClassId] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        alert("Only PDF files are allowed.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !classId || !year || !month) {
      alert("Please fill in all fields and select a PDF file.");
      return;
    }

    try {
      setLoading(true);

      // 1. Upload PDF to external service
      const formData = new FormData();
      formData.append("file", file);
      formData.append("classId", classId);
      formData.append("year", year);
      formData.append("month", month);

      const uploadRes = await fetch("https://frage-lesson-plan.vercel.app/api/pdf/share", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload PDF to storage service.");
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success || !uploadData.url) {
        throw new Error("Invalid response from PDF storage service.");
      }

      const publicUrl = uploadData.url;
      const selectedClass = classes.find((c) => c.id === classId);
      const className = selectedClass ? selectedClass.name : "Class";

      // 2. Create Notice
      const noticePayload = {
        title: `${year}년 ${month}월 수업계획서`,
        content: `📎 ${className} ${month}월 수업계획서가 업로드되었습니다.\n\n[수업계획서 바로보기](${publicUrl})`,
        class_id: classId, // Single class ID
        attachment_url: publicUrl,
        attachment_type: "pdf",
      };

      const noticeRes = await fetch("/api/teacher/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticePayload),
      });

      if (!noticeRes.ok) {
        const errText = await noticeRes.text();
        throw new Error(`Failed to create notice: ${errText}`);
      }

      // 3. Success
      alert("Lesson plan uploaded and notice created successfully!");
      onSuccess(); // Refresh parent list
      router.refresh(); // Refresh server components if any
      handleClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during the process.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setClassId("");
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-frage-blue" />
            Upload Lesson Plan
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-frage-blue/20 transition-all"
              required
            >
              <option value="">Select a class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year / Month */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-frage-blue/20"
              >
                {[...Array(3)].map((_, i) => {
                  const y = new Date().getFullYear() - 1 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-frage-blue/20"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}월</option>
                ))}
              </select>
            </div>
          </div>

          {/* PDF Upload */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">PDF File</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                file ? "border-frage-blue bg-blue-50/50" : "border-slate-200 hover:border-frage-blue hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2 text-frage-blue">
                  <FileText className="w-8 h-8" />
                  <span className="font-bold text-sm">{file.name}</span>
                  <span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Upload className="w-8 h-8" />
                  <span className="font-medium text-sm">Click to upload PDF</span>
                  <span className="text-xs">Only PDF files supported</span>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !file || !classId}
            className="w-full bg-frage-navy text-white font-bold py-4 rounded-xl hover:bg-frage-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading & Creating Notice...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Upload & Post Notice
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
