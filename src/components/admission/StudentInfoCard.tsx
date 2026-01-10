import React from "react";
type Status = "waiting" | "consulting" | "consulted" | "approved";
type Props = {
  studentName: string;
  englishFirstName?: string;
  birthDate?: string;
  status: Status;
  campus?: string;
  address?: string;
  parentPhone?: string;
};
const STATUS_LABELS: Record<Status, string> = {
  waiting: "원서 접수 완료",
  consulting: "상담 예약 대기",
  consulted: "상담 완료",
  approved: "입학 승인 완료",
};
export default function StudentInfoCard({
  studentName,
  englishFirstName,
  birthDate,
  status,
  campus,
  address,
  parentPhone,
}: Props) {
  const statusLabel = STATUS_LABELS[status];
  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-slate-900 font-bold text-lg">{studentName}</div>
            {englishFirstName ? (
              <div className="text-slate-500 font-medium text-sm">{englishFirstName}</div>
            ) : (
              <div className="text-slate-400 font-medium text-sm">영문 이름 미입력</div>
            )}
            {birthDate ? (
              <div className="text-slate-500 text-sm">{birthDate}</div>
            ) : (
              <div className="text-slate-400 text-sm">생년월일 미입력</div>
            )}
            {campus && (
              <div className="text-slate-500 text-sm">{campus}</div>
            )}
            {address ? (
              <div className="text-slate-500 text-sm">{address}</div>
            ) : (
              <div className="text-slate-400 text-sm">주소 미입력</div>
            )}
            {parentPhone ? (
              <div className="text-slate-500 text-sm">{parentPhone}</div>
            ) : (
              <div className="text-slate-400 text-sm">학부모 전화 미입력</div>
            )}
          </div>
          <div className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
            {statusLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
