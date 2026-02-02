import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { StickyNote } from "lucide-react";

import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export default async function AdminSurveyDetailPage({ params }: { params: { studentId: string } }) {
  const studentId = String(params.studentId || "");
  const supabaseAuth = createSupabaseServer();
  const { data: userData } = await supabaseAuth.auth.getUser();
  const user = userData?.user;
  
  if (!user) {
    redirect("/portal");
  }

  const role = await resolveUserRole(user);
  if (role !== "admin" && role !== "master_admin") {
    redirect("/portal");
  }

  const { data } = await supabaseService
    .from("admission_extras")
    .select("*")
    .eq("new_student_id", studentId)
    .maybeSingle();

  const extras = data ? {
    grade: String(data.grade ?? ""),
    current_school: String(data.current_school ?? ""),
    english_history: String(data.english_history ?? ""),
    official_score: data.official_score ? String(data.official_score) : "",
    sr_score: data.sr_score ? String(data.sr_score) : "",
    available_days: data.available_days ? String(data.available_days) : "",
    updated_at: String(data.updated_at ?? ""),
  } : null;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-blue-600" />
            상담 전 설문 상세
          </h1>
          <Link
            href="/admin/new-students"
            className="text-sm font-bold text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
          >
            목록으로
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${extras ? "bg-green-500" : "bg-slate-300"}`}></div>
              <div className="text-sm font-bold text-slate-900">작성 상태</div>
            </div>
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${extras ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
              {extras ? "완료" : "미작성"}
            </span>
          </div>
          <div className="p-6">
            {extras ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-1">학년</div>
                  <div className="text-sm font-bold text-slate-900">{extras.grade || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-1">재학 학교</div>
                  <div className="text-sm font-bold text-slate-900">{extras.current_school || "-"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-bold text-slate-500 mb-1">영어 학습 이력</div>
                  <div className="text-sm font-bold text-slate-900 break-words">{extras.english_history || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-1">공인시험 점수 (선택)</div>
                  <div className="text-sm font-bold text-slate-900">{extras.official_score || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-1">SR 점수 (선택)</div>
                  <div className="text-sm font-bold text-slate-900">{extras.sr_score || "-"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-bold text-slate-500 mb-1">상담 가능 요일/시간</div>
                  <div className="text-sm font-bold text-slate-900 break-words">{extras.available_days || "-"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs font-bold text-slate-500 mb-1">업데이트 시각</div>
                  <div className="text-sm font-bold text-slate-900">{extras.updated_at ? extras.updated_at.replace("T", " ").slice(0, 16) : "-"}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-600">설문 데이터가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

