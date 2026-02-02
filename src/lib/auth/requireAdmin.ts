// src/lib/auth/requireAdmin.ts
import { NextResponse } from "next/server";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export async function requireAdmin(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: new NextResponse(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  const role = await resolveUserRole(user);

  if (role !== "admin" && role !== "master_admin") {
    return {
      error: new NextResponse(
        JSON.stringify({ error: "forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { user, role };
}
