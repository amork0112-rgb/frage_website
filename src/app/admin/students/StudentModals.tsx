"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { StudentFull } from "@/lib/types";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentFull | null;
  onSuccess: () => void;
}

// ----------------------------------------------------------------------
// 1. Status Modal
// ----------------------------------------------------------------------
const STATUS_OPTIONS = ["재원", "휴원", "퇴원"];

export function StatusModal({ open, onClose, student, onSuccess }: ModalProps) {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && student) {
      // 만약 student.status가 옵션에 없으면 기본값 "재원"
      setStatus(STATUS_OPTIONS.includes(student.status) ? student.status : "재원");
    }
  }, [open, student]);

  const handleSave = async () => {
    if (!student) return;
    try {
      setLoading(true);
      const res = await fetch("/api/admin/students/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      onSuccess();
      onClose();
    } catch (e) {
      alert("상태 변경 실패: " + e);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold mb-4">상태 변경</h2>
        <p className="text-sm text-slate-600 mb-4">
          <span className="font-bold text-slate-900">{student.student_name}</span> 학생의 상태를 변경합니다.
        </p>

        <div className="space-y-2 mb-6">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="status"
                value={opt}
                checked={status === opt}
                onChange={(e) => setStatus(e.target.value)}
                className="w-4 h-4 text-frage-blue"
              />
              <span className="text-sm font-bold text-slate-700">{opt}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white bg-frage-blue hover:bg-blue-600 rounded-lg disabled:opacity-50"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. Consult Modal
// ----------------------------------------------------------------------
interface ConsultRecord {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export function ConsultModal({ open, onClose, student, onSuccess }: ModalProps) {
  const [records, setRecords] = useState<ConsultRecord[]>([]);
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Fetch records when modal opens
  useEffect(() => {
    if (open && student) {
      fetchRecords();
    } else {
      setRecords([]);
      setNewContent("");
    }
  }, [open, student]);

  const fetchRecords = async () => {
    if (!student) return;
    try {
      setFetching(true);
      const res = await fetch(`/api/admin/student-consults?studentId=${student.id}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = async () => {
    if (!student || !newContent.trim()) return;
    try {
      setLoading(true);
      const res = await fetch("/api/admin/student-consults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          content: newContent,
          created_by: "관리자", // 실제로는 세션에서 가져와야 하지만, API에서 처리하거나 여기서 보냄
        }),
      });
      if (!res.ok) throw new Error("Failed to add consult");

      setNewContent("");
      fetchRecords(); // Refresh list
      // onSuccess(); // Optional: if we want to refresh student list (e.g. consult count)
    } catch (e) {
      alert("상담 기록 추가 실패: " + e);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold mb-1">상담 기록</h2>
        <p className="text-sm text-slate-600 mb-4">{student.student_name}</p>

        <div className="flex-1 overflow-y-auto mb-4 border rounded-lg p-4 bg-slate-50 min-h-[200px]">
          {fetching ? (
            <div className="text-center text-slate-400 py-4">로딩 중...</div>
          ) : records.length === 0 ? (
            <div className="text-center text-slate-400 py-4">기록이 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {records.map((r) => (
                <div key={r.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-800 whitespace-pre-wrap">{r.content}</div>
                  <div className="mt-2 text-xs text-slate-400 flex justify-between">
                    <span>{r.created_by}</span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="새로운 상담 내용을 입력하세요..."
            className="w-full p-3 border border-slate-200 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-frage-blue outline-none resize-none h-24"
          />
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
              닫기
            </button>
            <button
              onClick={handleAdd}
              disabled={loading || !newContent.trim()}
              className="px-4 py-2 text-sm font-bold text-white bg-frage-blue hover:bg-blue-600 rounded-lg disabled:opacity-50"
            >
              {loading ? "저장 중..." : "기록 추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. Class Modal
// ----------------------------------------------------------------------
interface ClassModalProps extends ModalProps {
  classes: string[]; // List of class names
}

export function ClassModal({ open, onClose, student, onSuccess, classes }: ClassModalProps) {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && student) {
      setSelectedClass(student.main_class || ""); // Use main_class field
    }
  }, [open, student]);

  const handleSave = async () => {
    if (!student) return;
    try {
      setLoading(true);
      // If empty string, treat as null (no class) or validate?
      // User requirement says "select class -> save". Assuming empty string means "no class" if allowed.
      
      const res = await fetch("/api/admin/students/class", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          studentId: student.id, 
          classId: selectedClass || null 
        }),
      });
      if (!res.ok) throw new Error("Failed to update class");
      
      onSuccess();
      onClose();
    } catch (e) {
      alert("반 변경 실패: " + e);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold mb-4">반 변경</h2>
        <p className="text-sm text-slate-600 mb-4">
          <span className="font-bold text-slate-900">{student.student_name}</span> 학생의 반을 변경합니다.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 mb-2">반 선택</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="">(반 없음)</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white bg-frage-blue hover:bg-blue-600 rounded-lg disabled:opacity-50"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
