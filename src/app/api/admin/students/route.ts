import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 200 });
    }
    const rows = Array.isArray(data) ? data : [];
    const base: Student[] = rows.map((r: any) => ({
      id: String(r.id ?? ""),
      childId: r.child_id ?? undefined,
      name: String(r.name ?? ""),
      englishName: String(r.english_name ?? ""),
      birthDate: String(r.birth_date ?? ""),
      phone: String(r.phone ?? ""),
      className: String(r.class_name ?? "미배정"),
      campus: String(r.campus ?? "미지정"),
      status: (String(r.status ?? "재원") as Status),
      parentName: String(r.parent_name ?? ""),
      parentAccountId: String(r.parent_account_id ?? ""),
      address: String(r.address ?? ""),
      bus: String(r.bus ?? ""),
      departureTime: String(r.departure_time ?? "")
    }));
    const total = base.length;
    const start = (page - 1) * pageSize;
    const items = base.slice(start, start + pageSize);
    return NextResponse.json({ items, total, page, pageSize }, { status: 200 });
  } catch {
    return NextResponse.json({ items: [], total: 0, page, pageSize }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: Student[] = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ ok: false, inserted: 0 }, { status: 400 });
    }
    let inserted = 0;
    for (const s of items) {
      await supabase.from("students").insert({
        id: s.id,
        child_id: s.childId ?? null,
        name: s.name,
        english_name: s.englishName,
        birth_date: s.birthDate,
        phone: s.phone,
        class_name: s.className,
        campus: s.campus,
        status: s.status,
        parent_name: s.parentName,
        parent_account_id: s.parentAccountId,
        address: s.address,
        bus: s.bus,
        departure_time: s.departureTime,
      });
      inserted++;
    }
    return NextResponse.json({ ok: true, inserted }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, inserted: 0 }, { status: 400 });
  }
}
