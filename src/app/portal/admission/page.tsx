"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, CheckCircle, Lock, ChevronRight, AlertCircle } from "lucide-react";

type ChecklistItem = {
  key: string;
  label: string;
  checked: boolean;
  date?: string;
  by?: string;
};

type StudentChecklist = {
  [key: string]: ChecklistItem;
};

const ADMISSION_DOCS = [
  { id: 1, title: "입학원서", type: "form", desc: "기본 인적사항 및 학적 정보" },
  { id: 2, title: "기초실태조사서", type: "form", desc: "자녀의 생활 습관 및 건강 정보" },
  { id: 3, title: "수업료 및 환불 규정", type: "read", desc: "학원비 납부 및 환불 관련 동의" },
  { id: 4, title: "방과후 안내", type: "read", desc: "방과후 프로그램 신청 안내" },
  { id: 5, title: "오리엔테이션 안내", type: "read", desc: "신입생 오리엔테이션 일정 및 장소" },
];

export default function PortalAdmissionPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmissionConfirmed, setIsAdmissionConfirmed] = useState(false);
  const [submittedDocs, setSubmittedDocs] = useState<number[]>([]);
  const [campus, setCampus] = useState<string>("");

  useEffect(() => {
    try {
      // 1. Get current user ID
      const accountRaw = localStorage.getItem("portal_account");
      if (!accountRaw) {
        setLoading(false);
        return;
      }
      const account = JSON.parse(accountRaw);
      const studentId = account.id;
      if (account.campus) setCampus(account.campus);

      // 2. Check admission status from teacher checklist
      const checklistsRaw = localStorage.getItem("teacher_new_student_checklists");
      if (checklistsRaw) {
        const checklists = JSON.parse(checklistsRaw);
        const myChecklist: StudentChecklist = checklists[studentId] || {};
        
        // Check if "admission_confirmed" is checked
        if (myChecklist["admission_confirmed"]?.checked) {
          setIsAdmissionConfirmed(true);
        }
      }

      // 3. Load submitted docs
      const submittedRaw = localStorage.getItem(`portal_admission_docs_${studentId}`);
      if (submittedRaw) {
        setSubmittedDocs(JSON.parse(submittedRaw));
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignAndSubmit = () => {
    if (!confirm("모든 서류의 내용을 확인하였으며, 전자서명으로 일괄 제출하시겠습니까?")) return;

    try {
      const accountRaw = localStorage.getItem("portal_account");
      if (!accountRaw) return;
      const account = JSON.parse(accountRaw);
      const studentId = account.id;

      // Mark all as submitted
      const allDocIds = ADMISSION_DOCS.map(d => d.id);
      setSubmittedDocs(allDocIds);
      localStorage.setItem(`portal_admission_docs_${studentId}`, JSON.stringify(allDocIds));
      
      alert("✅ 전자서명 및 제출이 완료되었습니다.");
    } catch {}
  };

  if (loading) return <div className="p-8 text-center">로딩중...</div>;

  if (!isAdmissionConfirmed) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">입학 서류 패키지가 아직 열리지 않았습니다.</h2>
        <p className="text-slate-500 max-w-sm mx-auto mb-8">
          입학이 확정되면 담당 선생님께서 서류 작성을 안내해 드립니다.<br/>
          잠시만 기다려 주세요.
        </p>
        <Link href="/portal/home" className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const allCompleted = ADMISSION_DOCS.every(d => submittedDocs.includes(d.id));

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-100 p-6 sticky top-0 z-10">
        <div className="max-w-xl mx-auto">
          <h1 className="text-xl font-black text-slate-900 mb-1">입학 서류 패키지</h1>
          <p className="text-sm text-slate-500">입학에 필요한 모든 서류를 한 번에 해결하세요.</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-6">
        {/* Progress Card */}
        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold mb-1">서류 제출 현황</h2>
              <p className="text-blue-100 text-sm">모든 서류가 완료되면 입학 준비가 끝납니다.</p>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold backdrop-blur-sm">
              {submittedDocs.length} / {ADMISSION_DOCS.length}
            </div>
          </div>
          <div className="w-full bg-blue-900/30 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-white h-full transition-all duration-500" 
              style={{ width: `${(submittedDocs.length / ADMISSION_DOCS.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Doc List */}
        <div className="space-y-3">
          {ADMISSION_DOCS.map(doc => {
            const isCompleted = submittedDocs.includes(doc.id);
            return (
              <div 
                key={doc.id}
                onClick={() => !isCompleted && handleSubmitDoc(doc.id)}
                className={`group bg-white p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${isCompleted ? 'border-blue-100 bg-blue-50/30' : 'border-slate-100 hover:border-blue-200 hover:shadow-md'}`}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-base mb-0.5 ${isCompleted ? 'text-blue-900' : 'text-slate-900'}`}>
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-500">{doc.desc}</p>
                  </div>
                  {!isCompleted && <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-400" />}
                </div>
              </div>
            );
          })}
        </div>

        {allCompleted && (
          <div className="mt-8 p-6 bg-green-50 rounded-2xl border border-green-100 text-center animate-fade-in">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-green-800 mb-1">모든 서류 제출이 완료되었습니다!</h3>
            <p className="text-sm text-green-600">선생님께서 확인 후 최종 입학 안내를 드릴 예정입니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}
