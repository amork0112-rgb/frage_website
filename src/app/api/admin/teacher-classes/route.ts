export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ("error" in guard) return guard.error;

    // Use supabaseService to bypass RLS
    const { data, error } = await supabaseService
      .from("teacher_classes")
      .select("*");

    if (error) {
      console.error("Error fetching teacher classes:", error);
      return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = createSupabaseServer();
    const guard = await requireAdmin(supabaseAuth);
    if ("error" in guard) return guard.error;

    const body = await req.json();
    const { teacherId, classNames } = body;

    if (!teacherId || !Array.isArray(classNames)) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    // Use supabaseService to bypass RLS for admin operations
    // 1. Delete existing classes for this teacher
    const { error: deleteError } = await supabaseService
      .from("teacher_classes")
      .delete()
      .eq("teacher_id", teacherId);

    if (deleteError) {
      console.error("Error deleting teacher classes:", deleteError);
      return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
    }

    // 2. Insert new classes if any
    if (classNames.length > 0) {
      const payload = classNames.map((className) => ({
        teacher_id: teacherId,
        class_name: className,
      }));

      const { error: insertError } = await supabaseService
        .from("teacher_classes")
        .insert(payload);

      if (insertError) {
        console.error("Error inserting teacher classes:", insertError);
        return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
