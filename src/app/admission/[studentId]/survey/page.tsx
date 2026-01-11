// /admission/[studentId]/survey/page.tsx
/**
 * Guard logic depends on /api/admission/home
 * - items[] must include admissionStep
 * - only admissionStep === "reserved" can access survey
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdmissionSurveyPage({
  params,
}: {
  params: { studentId: string };
}) {
  const router = useRouter();
  const studentId = String(params.studentId || "");

  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [guardPassed, setGuardPassed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [lead, setLead] = useState<string[]>([]);
  const [leadEtc, setLeadEtc] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [reasonsEtc, setReasonsEtc] = useState("");
  const [expectations, setExpectations] = useState("");
  const [concerns, setConcerns] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admission/home", { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/portal");
          return;
        }
        const payload = await res.json().catch(() => ({}));
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const target = items.find((it: any) => String(it?.id || "") === studentId) || null;
        if (!target) {
          router.replace("/admission");
          return;
        }
        const step = String(target?.admissionStep || "not_reserved");
        if (step !== "reserved" && step !== "reserved_confirmed") {
          router.replace("/admission");
          return;
        }
        setAuthorized(true);
        setGuardPassed(true);
      } catch {
        router.replace("/admission");
      } finally {
        setAuthChecked(true);
        setLoading(false);
      }
    })();
  }, [router, studentId]);

  const progress = useMemo(() => {
    let p = 0;
    if (lead.length > 0) p++;
    if (reasons.length > 0) p++;
    if (expectations.trim().length > 0) p++;
    return `${p}/3`;
  }, [lead, reasons, expectations]);

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        Loading...
      </div>
    );
  }

  if (!authorized || !guardPassed) return null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 max-w-lg mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-slate-900">상담 전 설문</h1>
          <span className="text-xs font-bold text-slate-500">{progress}</span>
        </div>
        <p className="text-sm text-slate-600">
          상담을 더 정확하게 준비하기 위한 간단한 질문입니다. (약 2분)
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (expectations.length > 300) {
            alert("기대하는 점은 300자 이내로 작성해주세요.");
            return;
          }
          (async () => {
            try {
              const payload = {
                student_id: studentId,
                lead_source: [
                  ...lead.filter((v) => v !== "기타"),
                  ...(lead.includes("기타") && leadEtc.trim() ? [leadEtc.trim()] : []),
                ],
                interest_reasons: [
                  ...reasons.filter((v) => v !== "기타"),
                  ...(reasons.includes("기타") && reasonsEtc.trim() ? [reasonsEtc.trim()] : []),
                ],
                expectations: expectations.trim(),
                concerns: concerns.trim() ? concerns.trim() : null,
              };
              const res = await fetch("/api/admission/survey", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok || data?.ok !== true) {
                const msg = data?.error ? String(data.error) : "저장 중 문제가 발생했습니다.";
                alert(msg);
                return;
              }
              alert("상담 준비가 완료되었습니다.");
              router.replace("/admission");
            } catch {
              alert("저장 중 문제가 발생했습니다.");
            }
          })();
        }}
        className="space-y-6"
      >
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="mb-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              프라게를 어떻게 알게 되셨나요? <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                "지인 추천",
                "형제·지인 재원",
                "네이버 검색",
                "블로그 / 카페",
                "인스타그램",
                "지역 커뮤니티 (맘카페 등)",
                "현수막 / 간판",
                "설명회 / 행사",
                "기타",
              ].map((opt) => {
                const active = lead.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setLead((prev) =>
                        active ? prev.filter((v) => v !== opt) : [...prev, opt]
                      )
                    }
                    className={`px-3 py-1.5 rounded-full border text-sm font-bold transition-all ${
                      active
                        ? "bg-purple-600 border-purple-600 text-white scale-[1.03]"
                        : "bg-white border-slate-300 text-slate-700 hover:border-purple-400"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {lead.includes("기타") && (
              <input
                type="text"
                value={leadEtc}
                onChange={(e) => setLeadEtc(e.target.value)}
                placeholder="기타 내용 입력"
                className="mt-2 w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-slate-900"
              />
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="mb-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              프라게에 관심을 가지신 이유는 무엇인가요? <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                "영어 실력 향상",
                "발표·토론·사고력 수업",
                "프로젝트형 수업",
                "선생님/원장에 대한 신뢰",
                "초등·중등까지 이어지는 커리큘럼",
                "아이 성향에 맞을 것 같아서",
                "주변 평판",
                "기타",
              ].map((opt) => {
                const active = reasons.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setReasons((prev) =>
                        active ? prev.filter((v) => v !== opt) : [...prev, opt]
                      )
                    }
                    className={`px-3 py-1.5 rounded-full border text-sm font-bold transition-all ${
                      active
                        ? "bg-purple-600 border-purple-600 text-white scale-[1.03]"
                        : "bg-white border-slate-300 text-slate-700 hover:border-purple-400"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {reasons.includes("기타") && (
              <input
                type="text"
                value={reasonsEtc}
                onChange={(e) => setReasonsEtc(e.target.value)}
                placeholder="기타 내용 입력"
                className="mt-2 w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-slate-900"
              />
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="mb-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              프라게에서 아이가 어떤 모습으로 성장하길 바라시나요? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={expectations}
              onChange={(e) => setExpectations(e.target.value.slice(0, 300))}
              placeholder="예) 영어로 자기 생각을 자신 있게 말하는 아이가 되었으면 합니다."
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-slate-900 min-h-[80px]"
            />
            <div className="text-xs text-slate-400 mt-1">자유롭게 작성해주세요 (최대 300자)</div>
          </div>
          <div className="mb-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              현재 가장 걱정되는 부분이 있다면 무엇인가요? <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              placeholder="예: 말하기 자신감, 영어에 대한 거부감 등"
              className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-slate-900"
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={lead.length === 0 || reasons.length === 0 || expectations.trim().length === 0}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            저장하고 상담 준비하기
          </button>
        </div>
      </form>
    </main>
  );
}
