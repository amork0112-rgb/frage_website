"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = {
  currentStep?: string;
};

export default function AdmissionHeader({ currentStep }: Props) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    router.replace("/portal");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="h-14 px-4 max-w-5xl mx-auto flex items-center justify-between">
        <div className="font-black text-slate-900">입학 포털</div>
        <div className="flex items-center gap-2">
          {currentStep && (
            <div className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold">
              {currentStep}
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-900 text-white hover:bg-slate-800"
          >
            로그아웃
          </button>
          <button
            type="button"
            aria-label="도움말"
            title="도움말"
            onClick={() => setHelpOpen(true)}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
      {helpOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white w-[92vw] max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="text-sm font-black text-slate-900">도움말</div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-900 text-white hover:bg-slate-800"
              >
                닫기
              </button>
            </div>
            <div className="p-5 text-sm text-slate-700 space-y-3">
              <div className="font-bold text-slate-900">이용 안내</div>
              <div>회원가입 후 입학 포털에서 신규 학생 정보를 확인하고 진행합니다.</div>
              <div className="font-bold text-slate-900">진행 단계</div>
              <div>
                원서 접수 → 상담/테스트 예약 → 입학 서류 제출 → 입학 준비
              </div>
              <div className="font-bold text-slate-900">형제 추가</div>
              <div>형제 추가하기 버튼으로 부모 정보는 자동 입력되며 학생 정보만 작성합니다.</div>
              <div className="font-bold text-slate-900">예약 시간</div>
              <div>12:00, 16:00, 18:00 시간대는 예약이 제공되지 않습니다.</div>
              <div className="font-bold text-slate-900">중요 안내</div>
              <div>포털은 서버 API만 사용하며 데이터는 안전하게 저장됩니다.</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
