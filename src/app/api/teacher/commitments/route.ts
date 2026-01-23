import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");
    const date = searchParams.get("date");

    if (!classId || !date) {
      return NextResponse.json({ error: "Missing class_id or date" }, { status: 400 });
    }

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Fetch Students
    // Use supabaseService to bypass RLS issues
    const { data: students, error: studentError } = await supabaseService
      .from("students")
      .select("id, name, english_name, english_first_name")
      .eq("class_id", classId)
      .order("name");

    if (studentError) {
      console.error("Error fetching students:", studentError);
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }

    // 3. Fetch Subjects (Books) for the day
    // Logic: lesson_plans (class_id, date) -> book_id -> books (title)
    // We use supabaseService to ensure we can read these tables even if RLS is strict/missing for teachers
    
    // First try: Check if lesson_plans has book_id
    let subjects: any[] = [];
    
    // Querying lesson_plans directly
    const { data: plans, error: planError } = await supabaseService
      .from("lesson_plans")
      .select(`
        book_id,
        books (
          id,
          title
        )
      `)
      .eq("class_id", classId)
      .eq("date", date);

    if (planError) {
      console.error("Error fetching lesson plans:", planError);
      // Fallback or specific error handling
    } else if (plans) {
      subjects = plans.map((p: any) => ({
        id: p.book_id,
        title: p.books?.title || "Unknown Book"
      })).filter((s: any) => s.id); // Deduplicate if needed
    }

    // Deduplicate subjects by ID
    subjects = Array.from(new Map(subjects.map(s => [s.id, s])).values());

    // 4. Fetch Existing Commitments
    const { data: commitments, error: commitError } = await supabaseService
      .from("student_commitments")
      .select("student_id, book_id, status")
      .eq("class_id", classId)
      .eq("date", date);

    if (commitError) {
      console.error("Error fetching commitments:", commitError);
      // We don't fail hard here, just return empty commitments
    }

    return NextResponse.json({
      students: students?.map(s => ({
        id: s.id,
        name: s.name,
        english_name: s.english_first_name || s.english_name // Handle variations
      })) || [],
      subjects: subjects,
      commitments: commitments || []
    });

  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const body = await req.json();
    const { student_id, class_id, book_id, date, status } = body;

    if (!student_id || !class_id || !book_id || !date || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabaseService
      .from("student_commitments")
      .upsert({
        student_id,
        class_id,
        book_id,
        date,
        status,
        checked_by: user.id,
        checked_at: new Date().toISOString()
      }, {
        onConflict: "student_id,book_id,date"
      });

    if (error) {
      console.error("Error saving commitment:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
