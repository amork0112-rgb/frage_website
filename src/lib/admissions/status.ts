export type Status =
  | "waiting"
  | "consultation_reserved"
  | "consult_done"
  | "approved"
  | "promoted"
  | "rejected"
  | "hold";

export const STATUS_LABEL: Record<Status, string> = {
  waiting: "상담 대기",
  consultation_reserved: "상담 예약",
  consult_done: "상담 완료",
  approved: "서류 완료",
  promoted: "재원 전환",
  rejected: "거절",
  hold: "보류",
};

export const STATUS_BADGE_CLASS: Record<Status, string> = {
  waiting: "bg-slate-50 text-slate-700 border-slate-200",
  consultation_reserved: "bg-blue-50 text-blue-700 border-blue-200",
  consult_done: "bg-indigo-50 text-indigo-700 border-indigo-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  promoted: "bg-purple-50 text-purple-700 border-purple-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  hold: "bg-amber-50 text-amber-800 border-amber-200",
};

export const STATUS_PROGRESS: Record<Status, number> = {
  waiting: 10,
  consultation_reserved: 30,
  consult_done: 50,
  approved: 70,
  promoted: 100,
  rejected: 0,
  hold: 0,
};

export function toStatus(value: string): Status {
  if (
    value === "waiting" ||
    value === "consultation_reserved" ||
    value === "consult_done" ||
    value === "approved" ||
    value === "promoted" ||
    value === "rejected" ||
    value === "hold"
  ) {
    return value;
  }
  return "waiting";
}
