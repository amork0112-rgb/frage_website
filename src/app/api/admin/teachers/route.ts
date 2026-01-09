import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const guard = await requireAdmin(supabase);
    if ((guard as any).error) return (guard as any).error;

    // 3️⃣ teachers 조회 (RLS 적용)
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
    const enriched = await Promise.all(
      rows.map(async (row: any) => {
        const id = String(row.id);
        let email = "";
        try {
          const { data: userData } = await supabaseService.auth.admin.getUserById(id);
          email = String(userData?.user?.email || "");
        } catch {}
        return {
          id,
          name: String(row.name ?? ""),
          email,
          campus: String(row.campus ?? "International"),
          role: String(row.role ?? "teacher"),
          active: Boolean(row.active ?? true),
          createdAt: String(row.created_at ?? new Date().toISOString()),
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
