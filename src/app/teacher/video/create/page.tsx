"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Calendar, BookOpen, Users, Type } from "lucide-react";

type ClassItem = {
  id: string;
  name: string;
  campus: string;
};

export default function CreateVideoAssignmentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [subjectUnit, setSubjectUnit] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Validation State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/teacher/classes");
        if (res.ok) {
          const data = await res.json();
          // Ensure uniqueness if needed, though API should handle it
          setClasses(data);
        }
      } catch (error) {
        console.error("Failed to fetch classes", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();

    // Set default dates
    const today = new Date().toISOString().split("T")[0];
    setReleaseDate(today);
    
    // Default due date: 7 days later
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setDueDate(nextWeek.toISOString().split("T")[0]);
  }, []);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!selectedClass) newErrors.selectedClass = "Class is required";
    if (!releaseDate) newErrors.releaseDate = "Release date is required";
    if (!dueDate) newErrors.dueDate = "Due date is required";
    if (releaseDate && dueDate && releaseDate > dueDate) {
      newErrors.dueDate = "Due date cannot be earlier than release date";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/teacher/video-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subjectUnit,
          className: selectedClass,
          releaseDate,
          dueDate,
        }),
      });

      if (!res.ok) throw new Error("Failed to create assignment");

      // Redirect back to video management
      router.push("/teacher/video");
    } catch (error) {
      console.error("Error creating assignment:", error);
      alert("Failed to create assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/teacher/video"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Video Management
        </Link>
        <h1 className="text-2xl font-black text-slate-900">Create Video Assignment</h1>
        <p className="text-slate-500 mt-1">Manually create a video assignment for your class.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Type className="w-4 h-4 text-slate-400" />
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unit 5 Reading Practice"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.title ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-frage-navy"
              } bg-slate-50 focus:bg-white transition-all outline-none`}
            />
            {errors.title && <p className="text-xs font-bold text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Subject / Unit */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-400" />
              Subject / Unit <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={subjectUnit}
              onChange={(e) => setSubjectUnit(e.target.value)}
              placeholder="e.g. Wonders G3 / Unit 5"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-frage-navy transition-all outline-none"
            />
          </div>

          {/* Class Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Class <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="w-full h-12 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.selectedClass ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-frage-navy"
                } bg-slate-50 focus:bg-white transition-all outline-none appearance-none`}
              >
                <option value="">Select a class...</option>
                {classes.map((c, i) => (
                  <option key={`${c.id}-${i}`} value={c.name}>
                    {c.name} ({c.campus})
                  </option>
                ))}
              </select>
            )}
            {errors.selectedClass && <p className="text-xs font-bold text-red-500 mt-1">{errors.selectedClass}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Release Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.releaseDate ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-frage-navy"
                } bg-slate-50 focus:bg-white transition-all outline-none`}
              />
              {errors.releaseDate && <p className="text-xs font-bold text-red-500 mt-1">{errors.releaseDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.dueDate ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-frage-navy"
                } bg-slate-50 focus:bg-white transition-all outline-none`}
              />
              {errors.dueDate && <p className="text-xs font-bold text-red-500 mt-1">{errors.dueDate}</p>}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all ${
                saving
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-frage-navy hover:bg-frage-blue hover:shadow-lg hover:-translate-y-0.5"
              }`}
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Create Assignment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
