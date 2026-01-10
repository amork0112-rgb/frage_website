export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  try {
    // 1️⃣ 인증/권한 체크 (SSR)
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ("error" in guard) return guard.error;

    // 2️⃣ teachers 조회 (🔥 반드시 service_role 🔥)
    const { data: teachers, error } = await supabaseService
      .from("teachers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !teachers) {
      console.error("TEACHERS SELECT ERROR:", error);
      return NextResponse.json([], { status: 200 });
    }

    // 3️⃣ auth.users 이메일 병합 (실패해도 전체 실패 ❌)
    const enriched = await Promise.all(
      teachers.map(async (row: any) => {
        let email = "";

        try {
          const { data } = await supabaseService.auth.admin.getUserById(row.id);
          email = data?.user?.email ?? "";
        } catch (e) {
          // auth.users에 없을 수 있음 → 무시
          email = "";
        }

        return {
          id: String(row.id),
          name: String(row.name ?? ""),
          email,
          campus: String(row.campus ?? "International"),
          role: String(row.role ?? "teacher"),
          active: Boolean(row.active),
          createdAt: String(row.created_at),
        };
      })
    );

    return NextResponse.json(enriched, { status: 200 });
  } catch (e) {
    console.error("ADMIN TEACHERS API ERROR:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
