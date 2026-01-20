"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Bell, Plus, Trash2, X, AlertCircle, Smile, ChevronDown, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

type Notice = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  class_id: string;
  scope: string;
  creator_id: string;
  // We might want to join class name, but for now let's show class_id or rely on mapping
  // If the API returns class name, that would be better. 
  // For now let's assume we need to map class_id to name on client if possible, 
  // or just show "Class Notice"
};

type Student = {
  id: string;
  className: string;
  classId: string; // Assuming we can get classId from students API or similar
  classSortOrder?: number;
};

export default function TeacherNoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{id: string, name: string, sortOrder: number}[]>([]);
  
  // New Notice State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch notices
      const noticesRes = await fetch("/api/teacher/notices");
      if (noticesRes.ok) {
        const data = await noticesRes.json();
        setNotices(data.items || []);
      }

      // Fetch students to extract classes
      // Note: Ideally we should have a /api/teacher/classes endpoint. 
      // For now, we'll infer from students or just rely on manual input if we can't get IDs easily.
      // But wait, the API requires class_id. 
      // Let's try to fetch students and extract unique classes with IDs.
      const studentsRes = await fetch("/api/teacher/students");
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        const students: any[] = Array.isArray(data) ? data : data.items || [];
        
        // Map unique classes
        const classMap = new Map<string, { name: string, sortOrder: number }>();
        students.forEach(s => {
            // Assuming s.class_id and s.className exists
            // The previous code showed s.className, need to check if s.class_id (or classId) is available
            const cId = s.classId || s.class_id;
            const cName = s.className;
            const cSort = s.classSortOrder ?? 9999;
            if (cId && cName) {
                if (!classMap.has(cId)) {
                    classMap.set(cId, { name: cName, sortOrder: cSort });
                }
            }
        });
        
        const sortedClasses = Array.from(classMap.entries())
            .map(([id, { name, sortOrder }]) => ({ id, name, sortOrder }))
            .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));

        setClasses(sortedClasses);
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setLoading(false);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewContent((prev) => prev + emojiData.emoji);
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds(prev => {
        if (prev.includes(classId)) {
            return prev.filter(id => id !== classId);
        } else {
            return [...prev, classId];
        }
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassIds.length === 0) return alert("Please select at least one class");
    
    try {
      setSubmitting(true);
      
      const promises = selectedClassIds.map(classId => 
          fetch("/api/teacher/notices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: newTitle,
              content: newContent,
              scope: "class",
              class_id: classId
            })
          }).then(async res => {
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `Failed to create notice for class ${classId}`);
            }
            return res.json();
          })
      );

      await Promise.all(promises);

      // Reset and reload
      setNewTitle("");
      setNewContent("");
      setSelectedClassIds([]);
      setIsCreating(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    
    try {
      const res = await fetch(`/api/teacher/notices?id=${id}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        setNotices(prev => prev.filter(n => n.id !== id));
      } else {
        alert("Failed to delete notice");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting notice");
    }
  };

  const getClassName = (id: string) => {
    return classes.find(c => c.id === id)?.name || "Unknown Class";
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-frage-blue" />
            Class Notices (알림장)
          </h1>
          <p className="text-slate-500 mt-1">Send notices to your specific classes.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-frage-blue text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Notice
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800">New Class Notice</h3>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Target Classes</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-frage-blue/20 text-slate-700 bg-white text-left flex justify-between items-center"
                  >
                    <span className="truncate">
                      {selectedClassIds.length === 0 
                        ? "Select classes..." 
                        : selectedClassIds.length === 1
                          ? classes.find(c => c.id === selectedClassIds[0])?.name
                          : `${selectedClassIds.length} classes selected`
                      }
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {classes.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500 text-center">No classes found</div>
                      ) : (
                        classes.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => toggleClassSelection(c.id)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              selectedClassIds.includes(c.id) 
                                ? "bg-frage-blue border-frage-blue text-white" 
                                : "border-slate-300 bg-white"
                            }`}>
                              {selectedClassIds.includes(c.id) && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-slate-700">{c.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Title</label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Notice title..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-frage-blue/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Content</label>
              <div className="relative">
                <textarea
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write your notice here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-frage-blue/20 resize-none"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-frage-blue hover:bg-slate-100 rounded-lg transition-colors"
                  title="Add emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
                {showEmojiPicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowEmojiPicker(false)} 
                    />
                    <div className="absolute bottom-full right-0 mb-2 z-20 shadow-xl rounded-xl border border-slate-200">
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        width={300}
                        height={350}
                        searchDisabled={false}
                        skinTonesDisabled
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-frage-blue text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {submitting ? "Posting..." : "Post Notice"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading notices...</div>
      ) : notices.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-400">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">No notices yet</h3>
          <p className="text-slate-500">Create your first class notice using the button above.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {notices.map((notice) => (
            <div key={notice.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-frage-blue/10 text-frage-blue text-xs font-bold rounded-md">
                      {getClassName(notice.class_id)}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 mb-1">{notice.title}</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{notice.content}</p>
                </div>
                <button
                  onClick={() => handleDelete(notice.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
