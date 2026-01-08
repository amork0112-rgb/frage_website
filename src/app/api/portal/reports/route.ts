import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    const role = user.app_metadata?.role ?? "parent";
    if (role !== "parent") return NextResponse.json({ ok: false }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || "";
    if (!studentId) {
      return NextResponse.json({ ok: false, error: "missing_studentId" }, { status: 400 });
    }
    const { data, error } = await supabaseService
      .from("teacher_reports")
      .select("month, updated_at, status")
      .eq("student_id", studentId)
      .eq("status", "발송완료")
      .order("updated_at", { ascending: false });
    if (error) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }
    const rows = Array.isArray(data) ? data : [];
    const items = rows.map((r: any) => {
      const ymd = String(r.updated_at || "").slice(0, 10);
      const date = ymd ? ymd.replace(/-/g, ".") : new Date().toISOString().slice(0, 10).replace(/-/g, ".");
      return {
        id: `${studentId}_${String(r.month || "")}`,
        title: `${String(r.month || "")} Monthly Report`,
        date,
        month: String(r.month || "")
      };
    });
    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
