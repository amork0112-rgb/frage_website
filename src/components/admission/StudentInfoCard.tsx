import React from "react";
import { Status, STATUS_LABEL, STATUS_BADGE_CLASS } from "@/lib/admissions/status";

type Props = {
  studentName: string;
  englishFirstName?: string;
  birthDate?: string;
  status: Status;
  campus?: string;
  address?: string;
  parentPhone?: string;
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
          <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${STATUS_BADGE_CLASS[status]}`}>
            {STATUS_LABEL[status]}
          </div>
        </div>
      </div>
    </div>
  );
}
