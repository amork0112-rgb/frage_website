import { NextResponse } from "next/server";

type Status = "재원" | "휴원" | "퇴원";

type Student = {
  id: string;
  childId?: string;
  name: string;
  englishName: string;
  birthDate: string;
  phone: string;
  className: string;
  campus: string;
  status: Status;
  parentName: string;
  parentAccountId: string;
  address: string;
  bus: string;
  departureTime: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const pageSize = Math.max(parseInt(url.searchParams.get("pageSize") || "200", 10), 1);

  const base: Student[] = [];

  const withIndex = base.map((s, i) => ({ ...s, _idx: i }));
  const sorted = withIndex
    .sort((a, b) => {
      const an = String(a.name || "").trim();
      const bn = String(b.name || "").trim();
      if (an && bn) {
        const cmp = an.localeCompare(bn, "ko");
        if (cmp !== 0) return cmp;
        return a._idx - b._idx;
      }
      if (!an && bn) return 1;
      if (an && !bn) return -1;
      return a._idx - b._idx;
    })
    .map(({ _idx, ...rest }) => rest);

  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return NextResponse.json({ items, total, page, pageSize });
}
