import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check
    const role = user.app_metadata?.role;
    const isTeacher = role === "teacher" || role === "admin" || role === "master_teacher" || role === "master_admin";
    if (!isTeacher) {
       const { data: teacher } = await supabase.from("teachers").select("role").eq("auth_user_id", user.id).maybeSingle();
       if (!teacher) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase.storage
      .from("student-videos")
      .createSignedUrl(path, 3600); // 1 hour

    if (error) throw error;

    return NextResponse.json({ signedUrl: data.signedUrl });

  } catch (err) {
    console.error("Error signing URL:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
