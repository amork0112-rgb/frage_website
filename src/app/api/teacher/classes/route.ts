import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campusParam = searchParams.get("campus");

    const supabaseAuth = createSupabaseServer();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json([], { status: 401 });

    const role = await resolveUserRole(user);
    if (!["teacher", "master_teacher", "admin", "master_admin"].includes(role)) {
      return NextResponse.json([], { status: 403 });
    }

    let query = supabaseService
      .from("classes")
      .select("id, name, campus, sort_order");

    if (campusParam && campusParam !== "All") {
      // Map English to Korean
      let dbCampus = campusParam;
      if (campusParam === "International") dbCampus = "국제관";
      else if (campusParam === "Andover") dbCampus = "앤도버관"; // Assuming 'Andover' -> '앤도버' or '앤도버관' based on other files
      else if (campusParam === "Atheneum") dbCampus = "아테네움관";
      else if (campusParam === "Platz") dbCampus = "플라츠관";
      
      // Handle the case where the parameter might already be Korean or exact match
      // If dbCampus is still the same, maybe try to match partially or use OR logic?
      // For now, strict mapping based on known values.
      
      // NOTE: In `video-management`, we saw:
      // International: "국제관", Andover: "앤도버관", Atheneum: "아테네움관", Platz: "플라츠관"
      
      query = query.eq("campus", dbCampus);
    }

    const { data, error } = await query
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Teacher Classes Error:", error);
      return NextResponse.json([], { status: 500 });
    }

    const normalizeCampus = (c: string) => {
      if (!c) return "Unspecified";
      if (c === "국제관") return "International";
      if (c === "앤도버관") return "Andover";
      if (c === "아테네움관") return "Atheneum";
      if (c === "플라츠관") return "Platz";
      return c;
    };

    const items = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      campus: normalizeCampus(row.campus),
      sortOrder: row.sort_order,
    }));

    // Return array directly to match client expectations
    return NextResponse.json(items, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json([], { status: 500 });
  }
}
