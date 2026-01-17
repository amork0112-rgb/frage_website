import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    const id = Number(params.id);
    
    if (Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
    }

    // Call RPC to increment view count
    // This should work regardless of login status if the RPC is public/security definer
    const { error } = await supabase.rpc("increment_post_view", {
      p_post_id: id,
    });

    if (error) {
      console.error("View increment error:", error);
      // We return ok: true even if it fails to not disrupt the user experience
      // or to handle cases where the post might not exist but we don't want to expose it.
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("View increment exception:", e);
    return NextResponse.json({ ok: true });
  }
}
