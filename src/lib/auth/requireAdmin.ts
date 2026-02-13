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

  // Allow admin, master_admin, and master_teacher for admin APIs
  if (role !== "admin" && role !== "master_admin" && role !== "master_teacher") {
    return {
      error: new NextResponse(
        JSON.stringify({ error: "forbidden", role }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { user, role };
}
