import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const role = await resolveUserRole(user);
    if (role !== "parent") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: parent } = await supabaseService
      .from("parents")
      .select("id,name,phone,campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!parent) {
      return NextResponse.json({ ok: true, type: "no_parent" }, { status: 200 });
    }

    const parentId = String(parent.id);

    // 1. Fetch Enrolled Students (Promoted)
    const { data: enrolledStudents } = await supabaseService
      .from("v_students_full")
      .select("student_id,student_name,english_first_name,status,campus,parent_auth_user_id,grade,class_name")
      .eq("parent_auth_user_id", user.id);

    // 2. Fetch Applicants (New Students not yet promoted)
    const { data: applicants } = await supabaseService
      .from("new_students")
      .select("id,student_name,status,campus,created_by")
      .eq("created_by", user.id)
      .not("status", "eq", "promoted"); // Exclude those already promoted

    const enrolledIds = Array.isArray(enrolledStudents)
      ? enrolledStudents.map((s: any) => s.student_id).filter((v: any) => v)
      : [];

    let onboardingMap: Record<
      string,
      {
        profile_completed: boolean | null;
        use_bus: boolean | null;
        address: string | null;
        parent_auth_user_id: string | null;
      }
    > = {};

    if (enrolledIds.length > 0) {
      const { data: onboardingRows } = await supabase
        .from("students")
        .select("id,profile_completed,use_bus,address,parent_auth_user_id")
        .in("id", enrolledIds as any);

      onboardingMap =
        Array.isArray(onboardingRows)
          ? onboardingRows.reduce((acc: typeof onboardingMap, row: any) => {
              const key = String(row.id || "");
              if (!key) return acc;
              acc[key] = {
                profile_completed:
                  typeof row.profile_completed === "boolean"
                    ? row.profile_completed
                    : null,
                use_bus:
                  typeof row.use_bus === "boolean" ? row.use_bus : null,
                address: row.address ? String(row.address) : null,
                parent_auth_user_id: row.parent_auth_user_id
                  ? String(row.parent_auth_user_id)
                  : null,
              };
              return acc;
            }, {} as typeof onboardingMap)
          : {};
    }

    const enrolledItems = Array.isArray(enrolledStudents)
      ? enrolledStudents.map((s: any) => {
          const key = String(s.student_id || "");
          const onboarding = key ? onboardingMap[key] : undefined;
          return {
            id: key,
            name: String(s.student_name || ""),
            englishName: String(s.english_first_name || ""),
            status: String(s.status || "promoted"),
            className: String(s.class_name || s.grade || ""),
            campus: String(s.campus || ""),
            parentAccountId: String(s.parent_auth_user_id || ""),
            profile_completed: onboarding
              ? onboarding.profile_completed === true
              : null,
            parent_auth_user_id: onboarding
              ? onboarding.parent_auth_user_id
              : null,
            use_bus: onboarding ? onboarding.use_bus : null,
            address: onboarding ? onboarding.address : null,
            type: "enrolled",
          };
        })
      : [];

    const applicantItems = Array.isArray(applicants)
      ? applicants.map((s: any) => ({
          id: String(s.id),
          name: String(s.student_name || ""),
          englishName: "",
          status: String(s.status || "applicant"),
          className: "Admission Process",
          campus: String(s.campus || ""),
          parentAccountId: String(s.created_by || ""),
          profile_completed: false, // Applicants always need onboarding/info check
          type: "applicant",
        }))
      : [];

    return NextResponse.json({ ok: true, students: [...enrolledItems, ...applicantItems] }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
