import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role !== "parent") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: parent } = await supabase
      .from("parents")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!parent) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    const parentId = String(parent.id);

    const { data: rows } = await supabase
      .from("new_students")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false });

    const items = Array.isArray(rows)
      ? rows.map((r: any) => ({
          id: String(r.id || ""),
          status: String(r.status || ""),
          student_name: String(r.student_name || ""),
          english_first_name: String(r.english_first_name || ""),
          passport_english_name: String(r.passport_english_name || ""),
          child_birth_date: String(r.child_birth_date || ""),
          parent_name: String(r.parent_name || ""),
          phone: String(r.phone || ""),
          campus: String(r.campus || ""),
          created_at: String(r.created_at || ""),
          address: String(r.address || ""),
        }))
      : [];

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
