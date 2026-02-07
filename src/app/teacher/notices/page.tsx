//app/teacher/notices
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Bell, Plus, Trash2, X, AlertCircle, Smile, ChevronDown, Check, Paperclip, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { supabase } from "@/lib/supabase";

type Notice = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  class_id: string;
  scope: string;
  creator_id: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterClassId, setFilterClassId] = useState<string>("All");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [filterClassId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/teacher/classes?campus=All", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const sortedClasses = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          sortOrder: c.sortOrder ?? 9999,
        }));
        setClasses(sortedClasses);
      }
    } catch (e) {
      console.error("Failed to fetch classes", e);
    }
  };

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const query = filterClassId && filterClassId !== "All" 
        ? `/api/teacher/notices?classId=${filterClassId}`
        : "/api/teacher/notices";
      
      const noticesRes = await fetch(query);
      if (noticesRes.ok) {
        const data = await noticesRes.json();
        setNotices(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch notices", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchClasses(), fetchNotices()]);
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

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassIds.length === 0) return alert("Please select at least one class");
    
    try {
      setSubmitting(true);
      let finalContent = newContent;

      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;

      // Upload files if any
      if (files.length > 0) {
        setUploading(true);
        const uploadedLinks: string[] = [];
        
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `notices/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('notices') // Using 'notices' bucket. If it fails, we might need 'public' or 'assignments'
            .upload(filePath, file);

          if (uploadError) {
             // Fallback to 'public' if notices bucket doesn't exist
             console.warn("Upload to notices bucket failed, trying public...", uploadError);
             const { error: retryError } = await supabase.storage
                .from('public')
                .upload(filePath, file);
             
             if (retryError) throw new Error(`Upload failed: ${uploadError.message}`);
             
             const { data } = supabase.storage.from('public').getPublicUrl(filePath);
             uploadedLinks.push(data.publicUrl);
          } else {
             const { data } = supabase.storage.from('notices').getPublicUrl(filePath);
             uploadedLinks.push(data.publicUrl);
          }
        }

        if (uploadedLinks.length > 0) {
           // 1. Append to content (Markdown)
           finalContent += "\n\n<hr/>\n\n**Attachments:**\n";
           uploadedLinks.forEach((url, idx) => {
              const file = files[idx];
              const isImage = file.type.startsWith("image/");
              if (isImage) {
                 finalContent += `\n![${file.name}](${url})\n`;
              } else {
                 finalContent += `\n- [${file.name}](${url})\n`;
              }
           });

           // 2. Set Primary Attachment (First file) for Preview/Download UI
           attachmentUrl = uploadedLinks[0];
           const firstFile = files[0];
           if (firstFile.type.includes("pdf")) {
             attachmentType = "pdf";
           } else if (firstFile.type.startsWith("image/")) {
             attachmentType = "image";
           } else {
             attachmentType = "file";
           }
        }
        setUploading(false);
      }
      
      console.log({
        title: newTitle,
        content: finalContent,
        class_ids: selectedClassIds,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType
      });

      const res = await fetch("/api/teacher/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: finalContent,
          class_ids: selectedClassIds,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType
        })
      });

      const text = await res.text();
      console.log('NOTICE POST RESPONSE:', res.status, text);

      if (!res.ok) {
        try {
          const err = JSON.parse(text);
          throw new Error(err.error || "Failed to create notice");
        } catch {
          throw new Error(text || "Failed to create notice");
        }
      }

      // Reset and reload
      setNewTitle("");
      setNewContent("");
      setSelectedClassIds([]);
      setFiles([]);
      setIsCreating(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
      setUploading(false);
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
        <div className="flex items-center gap-3">
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-frage-blue/20 bg-white"
          >
            <option value="All">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-frage-blue text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Notice
          </button>
        </div>
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
                <label className="block text-sm font-bold text-slate-700 mb-1">Attachments</label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                      Attach Files
                    </button>
                    <span className="text-xs text-slate-400">Images, PDF, Documents supported</span>
                  </div>
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
                disabled={submitting || uploading}
                className="px-6 py-2 bg-frage-blue text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  "Post Notice"
                )}
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
            <div 
              key={notice.id} 
              onClick={() => toggleExpand(notice.id)}
              className="bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-frage-blue">
                      {getClassName(notice.class_id)}
                    </span>
                    <span>·</span>
                    <span>
                      {(() => {
                        const d = new Date(notice.created_at);
                        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                      })()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold leading-tight mb-1 text-slate-800 group-hover:text-frage-blue transition-colors flex items-center gap-2">
                    {notice.title}
                    {notice.attachment_url && (
                      <span className="text-xs text-slate-400" title="Has attachment">📎</span>
                    )}
                  </h3>
                  {expandedIds.has(notice.id) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-1">
                      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {notice.content}
                      </p>

                      {/* Attachment UI */}
                      {notice.attachment_url && (
                        <div className="mt-4 flex items-center gap-3">
                           {/* Preview (PDF only) */}
                           {notice.attachment_type === "pdf" && (
                             <a 
                               href={notice.attachment_url} 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-frage-blue border border-frage-blue rounded-lg hover:bg-blue-50" 
                               onClick={(e) => e.stopPropagation()} 
                             > 
                               📄 PDF 미리보기 
                             </a> 
                           )}
                       
                           {/* Download */} 
                           <a 
                             href={notice.attachment_url} 
                             download 
                             target="_blank"
                             className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-white bg-frage-blue rounded-lg hover:bg-blue-600" 
                             onClick={(e) => e.stopPropagation()} 
                           > 
                             ⬇ 다운로드 
                           </a> 
                         </div> 
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ChevronDown 
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedIds.has(notice.id) ? "rotate-180" : ""}`} 
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notice.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
