import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Auth Check (Parent/Student)
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);

  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Get Student Info (Campus, Class)
  // Assuming parent -> students relation
  // or if user is student.
  // Let's assume user is parent (based on profiles.role='parent') and we fetch their children.
  
  const { data: students, error: studentError } = await supabaseService
    .from("students")
    .select("campus, class_id")
    .eq("parent_auth_user_id", user.id); // Adjust column name if needed

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  const campuses = students?.map(s => s.campus).filter(Boolean) || [];
  const classIds = students?.map(s => s.class_id).filter(Boolean) || [];

  // 3. Build Query
  // Fetch:
  // - Global notices
  // - Campus notices (matching student campus)
  // - Class notices (matching student class)
  // - notice_type can be 'academic' or 'learning'
  // - category = 'notice'
  // - is_archived = false

  let orConditions = [`scope.eq.global`];
  if (campuses.length > 0) {
    // Format: scope.eq.campus,campus.in.(A,B) - this is tricky in OR string.
    // Supabase OR syntax: "scope.eq.global,and(scope.eq.campus,campus.in.(...))"
    orConditions.push(`and(scope.eq.campus,campus.in.(${campuses.map(c => `"${c}"`).join(',')}))`);
  }
  if (classIds.length > 0) {
    orConditions.push(`and(scope.eq.class,class_id.in.(${classIds.map(c => `"${c}"`).join(',')}))`);
  }

  const orQuery = orConditions.join(",");

  const { data, error } = await supabaseService
    .from("posts")
    .select("*")
    .eq("category", "notice")
    .not("is_archived", "eq", true)
    .or(orQuery)
    .order("is_pinned", { ascending: false }) // Pinned first
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
