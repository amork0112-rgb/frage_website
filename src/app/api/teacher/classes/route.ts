import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ items: [] }, { status: 401 });

    const role = await resolveUserRole(user);
    if (!["teacher", "master_teacher", "admin", "master_admin"].includes(role)) {
      return NextResponse.json({ items: [] }, { status: 403 });
    }

    const { data, error } = await supabaseService
      .from("classes")
      .select("id, name, campus, sort_order")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Teacher Classes Error:", error);
      return NextResponse.json({ items: [] }, { status: 500 });
    }

    const items = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      campus: row.campus,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
