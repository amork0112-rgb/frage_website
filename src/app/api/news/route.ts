export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "100"); // Fetch all/many by default for client-side pagination or set reasonable limit

    const { data, error } = await supabaseService
      .from("notice_promotions")
      .select(`
        id,
        title,
        pinned,
        push_enabled,
        created_at,
        posts (
          id,
          title,
          content,
          created_at,
          image_url
        )
      `)
      .eq("archived", false)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching news:", error);
      return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
