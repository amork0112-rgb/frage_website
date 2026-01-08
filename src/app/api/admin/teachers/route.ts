// src/app/api/admin/teachers/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET() {
  const { data, error } = await supabaseService
    .from("teachers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
