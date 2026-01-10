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
          <div
            aria-label="도움말"
            className="p-2 rounded-lg border border-slate-200 text-slate-500 bg-white"
            title="도움말"
          >
            <HelpCircle className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
