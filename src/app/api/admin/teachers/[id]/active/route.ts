import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    const guard = await requireAdmin(supabase);
    if ("error" in guard) return guard.error;

    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "missing_id" },
        { status: 400 }
      );
    }

    const { data: row, error: fetchErr } = await supabase
      .from("teachers")
      .select("active")
      .eq("id", id)
      .single();

    if (fetchErr) {
      console.error("FETCH ACTIVE ERROR:", fetchErr);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const nextActive = !Boolean(row?.active);

    const { error: updateErr } = await supabase
      .from("teachers")
      .update({
        active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) {
      console.error("UPDATE ACTIVE ERROR:", updateErr);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, id, active: nextActive },
      { status: 200 }
    );
  } catch (e) {
    console.error("ACTIVE TOGGLE ERROR:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
