import { NextResponse } from "next/server";

export async function requireAdmin(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: new NextResponse(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }) };
  }
  const role = user.app_metadata?.role ?? "parent";
  if (role !== "admin" && role !== "master_admin") {
    return { error: new NextResponse(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } }) };
  }
  return { user };
}
