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
      .select("id,name,phone,campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!parent) {
      return NextResponse.json({ ok: true, type: "no_parent" }, { status: 200 });
    }

    const parentId = String(parent.id);

    const { data: students } = await supabase
      .from("students")
      .select("id,name,english_name,status,class_name,campus,parent_account_id")
      .eq("parent_id", parentId);

    const items = Array.isArray(students)
      ? students.map((s: any) => ({
          id: String(s.id || ""),
          name: String(s.name || ""),
          englishName: String(s.english_name || ""),
          status: String(s.status || ""),
          className: String(s.class_name || ""),
          campus: String(s.campus || ""),
          parentAccountId: String(s.parent_account_id || ""),
        }))
      : [];
    return NextResponse.json({ ok: true, students: items }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
