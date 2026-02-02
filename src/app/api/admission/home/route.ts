//app/api/admission/home/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveUserRole } from "@/lib/auth/resolveUserRole";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createSupabaseServer();

    /* 1️⃣ 인증 확인 */
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const role = await resolveUserRole(user);
    if (role !== "parent") {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    /* 2️⃣ 부모 정보 조회 */
    const { data: parent, error: parentErr } = await supabaseService
      .from("parents")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (parentErr || !parent) {
      await supabaseService
        .from("parents")
        .upsert([{ auth_user_id: user.id, name: "", phone: "", campus: "All" }], { onConflict: "auth_user_id" });
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    /* 3️⃣ 신규 학생(new_students) 조회 */
    const { data: rows, error: studentErr } = await supabaseService
      .from("new_students")
      .select(`
        id,
        status,
        student_name,
        english_first_name,
        passport_english_name,
        child_birth_date,
        parent_name,
        phone,
        campus,
        address,
        created_at
      `)
      .eq("parent_id", parent.id)
      .order("created_at", { ascending: false });

    if (studentErr) {
      return NextResponse.json(
        { ok: false, error: "fetch_failed" },
        { status: 500 }
      );
    }

    const list = Array.isArray(rows) ? rows : [];
    const studentIds = list.map((r: any) => String(r.id));
    let confirmMap: Record<string, boolean> = {};
    let surveyMap: Record<string, boolean> = {};

    if (studentIds.length > 0) {
      const { data: checks } = await supabaseService
        .from("new_student_checklists")
        .select("student_id,key,checked")
        .in("student_id", studentIds)
        .eq("key", "consultation_confirmed");
      (checks || []).forEach((c: any) => {
        const sid = String(c.student_id || "");
        confirmMap[sid] = !!c.checked;
      });

      const { data: surveys } = await supabaseService
        .from("admission_extras")
        .select("new_student_id")
        .in("new_student_id", studentIds);
      (surveys || []).forEach((s: any) => {
        const sid = String(s.new_student_id || "");
        surveyMap[sid] = true;
      });
    }

    const items = list.length
      ? await Promise.all(
          list.map(async (r: any) => {
            const { data: reservation } = await supabaseService
              .from("student_reservations")
              .select("id,slot_id")
              .eq("student_id", r.id)
              .maybeSingle();
            const { data: consult } = await supabaseService
              .from("student_consults")
              .select("id")
              .eq("student_id", r.id)
              .maybeSingle();
            let admissionStep: "not_reserved" | "reserved" | "reserved_confirmed" | "consult_done" | "approved" = "not_reserved";
            let reservationDate: string | null = null;
            let reservationTime: string | null = null;
            if (reservation?.slot_id) {
              admissionStep = "reserved";
              const { data: slot } = await supabaseService
                .from("consultation_slots")
                .select("date,time")
                .eq("id", reservation.slot_id)
                .maybeSingle();
              reservationDate = slot?.date ? String(slot.date) : null;
              reservationTime = slot?.time ? String(slot.time) : null;
            }
            const sid = String(r.id);
            if (admissionStep === "reserved" && confirmMap[sid]) {
              admissionStep = "reserved_confirmed";
            }
            if (consult) {
              admissionStep = "consult_done";
            }
            if (String(r.status || "") === "approved") {
              admissionStep = "approved";
            }
            return {
              id: String(r.id),
              status: String(r.status || "waiting"),
              admissionStep,
              reservation_date: reservationDate,
              reservation_time: reservationTime,
              student_name: String(r.student_name || ""),
              english_first_name: String(r.english_first_name || ""),
              passport_english_name: String(r.passport_english_name || ""),
              child_birth_date: r.child_birth_date ? String(r.child_birth_date) : "",
              parent_name: String(r.parent_name || ""),
              phone: String(r.phone || ""),
              campus: String(r.campus || ""),
              address: String(r.address || ""),
              created_at: r.created_at ? String(r.created_at) : "",
              survey_completed: !!surveyMap[sid],
            };
          })
        )
      : [];

    return NextResponse.json(
      { ok: true, items },
      { status: 200 }
    );
  } catch (e) {
    console.error("[admission/home] error", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
