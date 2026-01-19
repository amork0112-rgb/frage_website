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

/* ======================================================
   1. Status Modal
====================================================== */

const STATUS_OPTIONS = ["재원", "휴원", "퇴원"] as const;

export function StatusModal({ open, onClose, student, onSuccess }: ModalProps) {
  const [status, setStatus] = useState<string>("재원");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && student) {
      setStatus(STATUS_OPTIONS.includes(student.status as any) ? student.status : "재원");
    }
  }, [open, student]);

  const handleSave = async () => {
    if (!student) return;

    try {
      setLoading(true);
      const res = await fetch("/api/admin/students/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.student_id,
          status,
        }),
      });

      if (!res.ok) throw new Error("상태 변경 실패");

      onSuccess();
      onClose();
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!open || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400">
          <X />
        </button>

        <h2 className="text-lg font-bold mb-4">상태 변경</h2>
        <p className="text-sm mb-4">
          <strong>{student.student_name}</strong> 학생
        </p>

        <div className="space-y-2 mb-6">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt} className="flex items-center gap-2 p-2 border rounded cursor-pointer">
              <input
                type="radio"
                name="status"
                value={opt}
                checked={status === opt}
                onChange={() => setStatus(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>취소</button>
          <button onClick={handleSave} disabled={loading} className="bg-frage-blue text-white px-4 py-2 rounded">
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   2. Consult Modal
====================================================== */

interface ConsultRecord {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export function ConsultModal({ open, onClose, student }: ModalProps) {
  const [records, setRecords] = useState<ConsultRecord[]>([]);
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && student) fetchRecords();
    else setRecords([]);
  }, [open, student]);

  const fetchRecords = async () => {
    if (!student) return;
    const res = await fetch(`/api/admin/student-consults?studentId=${student.student_id}`);
    if (res.ok) setRecords(await res.json());
  };

  const handleAdd = async () => {
    if (!student || !newContent.trim()) return;

    try {
      setLoading(true);
      await fetch("/api/admin/student-consults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.student_id,
          content: newContent,
          created_by: "관리자",
        }),
      });

      setNewContent("");
      fetchRecords();
    } finally {
      setLoading(false);
    }
  };

  if (!open || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400">
          <X />
        </button>

        <h2 className="text-lg font-bold mb-4">상담 기록</h2>

        <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
          {records.map((r) => (
            <div key={r.id} className="border p-3 rounded">
              <div className="text-sm whitespace-pre-wrap">{r.content}</div>
              <div className="text-xs text-slate-400 mt-1">
                {r.created_by} · {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="w-full border rounded p-2 mb-3"
          placeholder="상담 내용 입력"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>닫기</button>
          <button onClick={handleAdd} disabled={loading} className="bg-frage-blue text-white px-4 py-2 rounded">
            {loading ? "저장 중..." : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   3. Class Modal
====================================================== */

interface ClassModalProps extends ModalProps {
  mainClasses: { id: string; name: string }[];
  programClasses: { id: string; name: string }[];
}

export function ClassModal({
  open,
  onClose,
  student,
  onSuccess,
  mainClasses,
  programClasses,
}: ClassModalProps) {
  const [selectedMainClass, setSelectedMainClass] = useState("");
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !student) return;

    (async () => {
      const res = await fetch(`/api/admin/students/${student.student_id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedMainClass(data.main_class_id ?? "");
        setSelectedPrograms(data.program_class_ids ?? []);
      }
    })();
  }, [open, student]);

  const toggleProgram = (id: string) => {
    setSelectedPrograms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!student) return;

    try {
      setLoading(true);
      await fetch(`/api/admin/students/${student.student_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          main_class_id: selectedMainClass || null,
          program_class_ids: selectedPrograms,
        }),
      });

      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!open || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400">
          <X />
        </button>

        <h2 className="text-lg font-bold mb-4">반 배정</h2>

        <div className="mb-4">
          <label className="font-bold text-sm">메인 클래스</label>
          <select
            value={selectedMainClass}
            onChange={(e) => setSelectedMainClass(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">미배정</option>
            {mainClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="font-bold text-sm">프로그램</label>
          <div className="grid grid-cols-2 gap-2">
            {programClasses.map((c) => (
              <label key={c.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPrograms.includes(c.id)}
                  onChange={() => toggleProgram(c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>취소</button>
          <button onClick={handleSave} disabled={loading} className="bg-frage-blue text-white px-4 py-2 rounded">
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
