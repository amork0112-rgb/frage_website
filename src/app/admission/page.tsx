"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import { CheckCircle, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdmissionPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState("대기");
  const [admissionOpen, setAdmissionOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace("/portal");
        return;
      }
      const role = (user.app_metadata as any)?.role ?? null;
      if (role !== "parent") {
        router.replace("/portal");
        return;
      }
      setAuthorized(true);
      setAuthChecked(true);
    })();
  }, [router]);

  useEffect(() => {
    (async () => {
      if (!authChecked || !authorized) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/admission/home", { cache: "no-store" });
        const payload = await res.json();
        const list = Array.isArray(payload?.items) ? payload.items : [];
        setItems(list);
        const first = list[0] || null;
        const status = String(first?.status || "");
        const step =
          status === "waiting"
            ? "상담 대기"
            : status === "consultation_confirmed"
            ? "상담 일정 확정"
            : status === "admission_open"
            ? "입학 서류 작성"
            : status === "approved"
            ? "승인 완료"
            : "대기";
        setCurrentStep(step);
        setAdmissionOpen(status === "admission_open");
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked, authorized]);

  if (!authChecked) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-yellow-700">신규 학생 상태</div>
            <div className="text-sm font-bold text-yellow-900">{currentStep}</div>
            <div className="text-xs text-yellow-800 mt-1">아직 수업은 시작되지 않았습니다.</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">현재 진행 상태</p>
              <h2 className="text-xl font-bold text-slate-900">{currentStep}</h2>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{
                width: admissionOpen ? "70%" : currentStep.includes("상담") ? "40%" : "10%",
              }}
            ></div>
          </div>
          <p className="text-right text-xs text-blue-500 font-bold mt-2">
            {admissionOpen ? "입학 서류 작성 단계" : currentStep.includes("상담") ? "상담 일정 진행" : "상담 대기"}
          </p>
        </div>
        <section>
          <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            입학 관련 안내
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-700">
            학원에서 곧 연락드려 상담 일정을 확정합니다. 입학 테스트 및 서류 작성은 상담 결과에 따라 진행됩니다.
          </div>
        </section>
      </main>
    </div>
  );
}
