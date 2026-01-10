import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ redirect: "/portal" }, { status: 200 });
    }
    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role !== "parent") {
      return NextResponse.json({ redirect: "/portal" }, { status: 200 });
    }
    const { data: parent } = await supabase
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!parent) {
      return NextResponse.json({ redirect: "/admission" }, { status: 200 });
    }
    const parentId = String(parent.id);
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("parent_id", parentId)
      .limit(1);
    const hasStudents = Array.isArray(students) && students.length > 0;
    return NextResponse.json({ redirect: hasStudents ? "/portal" : "/admission" }, { status: 200 });
  } catch {
    return NextResponse.json({ redirect: "/portal" }, { status: 200 });
  }
}
