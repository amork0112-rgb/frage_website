import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const role = (user.app_metadata as any)?.role ?? "parent";
    if (role !== "parent") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: parent } = await supabase
      .from("parents")
      .select("id,name,phone,campus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!parent) {
      return NextResponse.json({ ok: true, type: "no_parent" }, { status: 200 });
    }

    const parentId = String(parent.id);

    // 1. Fetch Enrolled Students (Promoted)
    const { data: enrolledStudents } = await supabase
      .from("v_students_full")
      .select("student_id,student_name,english_first_name,status,campus,parent_auth_user_id,class_name")
      .eq("parent_id", parentId);

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
        onboarding_step: string | null;
        pickup_method: string | null;
        pickup_lat: number | null;
        pickup_lng: number | null;
        pickup_address: string | null;
        dropoff_method: string | null;
        dropoff_lat: number | null;
        dropoff_lng: number | null;
        dropoff_address: string | null;
        default_dropoff_time: string | null;
      }
    > = {};

    if (enrolledIds.length > 0) {
      const { data: onboardingRows } = await supabase
        .from("students")
        .select(
          "id,profile_completed,use_bus,address,parent_auth_user_id,onboarding_step,pickup_method,pickup_lat,pickup_lng,pickup_address,dropoff_method,dropoff_lat,dropoff_lng,dropoff_address,default_dropoff_time"
        )
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
                onboarding_step: row.onboarding_step
                  ? String(row.onboarding_step)
                  : null,
                pickup_method: row.pickup_method
                  ? String(row.pickup_method)
                  : null,
                pickup_lat:
                  typeof row.pickup_lat === "number"
                    ? row.pickup_lat
                    : null,
                pickup_lng:
                  typeof row.pickup_lng === "number"
                    ? row.pickup_lng
                    : null,
                pickup_address: row.pickup_address
                  ? String(row.pickup_address)
                  : null,
                dropoff_method: row.dropoff_method
                  ? String(row.dropoff_method)
                  : null,
                dropoff_lat:
                  typeof row.dropoff_lat === "number"
                    ? row.dropoff_lat
                    : null,
                dropoff_lng:
                  typeof row.dropoff_lng === "number"
                    ? row.dropoff_lng
                    : null,
                dropoff_address: row.dropoff_address
                  ? String(row.dropoff_address)
                  : null,
                default_dropoff_time: row.default_dropoff_time
                  ? String(row.default_dropoff_time)
                  : null,
              };
              return acc;
            }, {} as typeof onboardingMap)
          : {};
    }

    // 2. Fetch New Students (Applicants, excluding promoted)
    const { data: newStudents } = await supabase
      .from("new_students")
      .select("id,student_name,english_first_name,status,campus,created_at")
      .eq("parent_id", parentId)
      .neq("status", "promoted");

    const enrolledItems = Array.isArray(enrolledStudents)
      ? enrolledStudents.map((s: any) => {
          const key = String(s.student_id || "");
          const onboarding = key ? onboardingMap[key] : undefined;
          return {
            id: key,
            name: String(s.student_name || ""),
            englishName: String(s.english_first_name || ""),
            status: String(s.status || "promoted"),
            className: String(s.class_name || ""),
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
            onboarding_step: onboarding ? onboarding.onboarding_step : null,
            pickup_method: onboarding ? onboarding.pickup_method : null,
            pickup_lat: onboarding ? onboarding.pickup_lat : null,
            pickup_lng: onboarding ? onboarding.pickup_lng : null,
            pickup_address: onboarding ? onboarding.pickup_address : null,
            dropoff_method: onboarding ? onboarding.dropoff_method : null,
            dropoff_lat: onboarding ? onboarding.dropoff_lat : null,
            dropoff_lng: onboarding ? onboarding.dropoff_lng : null,
            dropoff_address: onboarding ? onboarding.dropoff_address : null,
            default_dropoff_time: onboarding
              ? onboarding.default_dropoff_time
              : null,
            type: "enrolled",
          };
        })
      : [];

    const newItems = Array.isArray(newStudents)
      ? newStudents.map((s: any) => ({
          id: String(s.id || ""),
          name: String(s.student_name || ""),
          englishName: String(s.english_first_name || ""),
          status: String(s.status || "waiting"),
          className: "",
          campus: String(s.campus || ""),
          parentAccountId: user.id,
          type: "applicant"
        }))
      : [];

    const items = [...enrolledItems, ...newItems];

    return NextResponse.json({ ok: true, students: items }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
