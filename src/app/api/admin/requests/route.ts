import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseService } from "@/lib/supabase/service";

const json = (data: any, status = 200) =>
  new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServer();
    const guard = await requireAdmin(supabase);
    if ((guard as any).error) return (guard as any).error;

    const body = await req.json();
    const name = String(body?.name || "");
    const phone = String(body?.phone || "");
    const source = String(body?.source || "call");
    const status = String(body?.status || "draft");

    const childId = body?.childId ? String(body.childId) : null;
    const childName = body?.childName ? String(body.childName) : null;
    const campus = body?.campus ? String(body.campus) : null;
    const type = body?.type ? String(body.type) : null;
    const dateStart = body?.dateStart ? String(body.dateStart) : null;
    const dateEnd = body?.dateEnd ? String(body.dateEnd) : null;
    const time = body?.time ? String(body.time) : null;
    const changeType = body?.changeType ? String(body.changeType) : null;
    const medName = body?.medName ? String(body.medName) : null;
    const note = body?.note ? String(body.note) : null;

    let insertRow: any;
    if (name && phone) {
      insertRow = {
        name,
        phone,
        source,
        status,
        created_at: new Date().toISOString(),
      };
    } else if (childName && campus && type && dateStart) {
      insertRow = {
        child_id: childId,
        child_name: childName,
        campus,
        type,
        date_start: dateStart,
        date_end: dateEnd ?? null,
        time: time ?? null,
        change_type: changeType ?? null,
        med_name: medName ?? null,
        note: note ?? null,
        created_at: new Date().toISOString(),
      };
    } else {
      return json({ ok: false, error: "invalid_payload" }, 400);
    }

    const { error } = await supabaseService.from("portal_requests").insert(insertRow);
    if (error) {
      console.error("REQUEST INSERT ERROR", error);
      return json({ ok: false, error: error.message }, 500);
    }
    return json({ ok: true }, 200);
  } catch (e: any) {
    return json({ ok: false, error: "invalid" }, 400);
  }
}

export async function GET(_req: Request) {
  try {
    const supabase = createSupabaseServer();
    const guard = await requireAdmin(supabase);
    if ((guard as any).error) return (guard as any).error;

    // Fetch raw requests directly from the table to ensure we get all columns (especially time)
    const { data: rawRequests, error: reqError } = await supabaseService
      .from("portal_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (reqError) {
      console.error("REQUESTS FETCH ERROR", reqError);
      return json({ ok: true, items: [] }, 200);
    }

    // Collect student IDs to fetch class info
    const studentIds = Array.from(new Set((rawRequests || []).map((r: any) => r.child_id).filter(Boolean)));

    // Fetch student info (class_name, campus, etc.)
    let studentMap: Record<string, any> = {};
    if (studentIds.length > 0) {
      const { data: students } = await supabaseService
        .from("v_students_full")
        .select("*")
        .in("student_id", studentIds);
      
      (students || []).forEach((s: any) => {
        studentMap[s.student_id] = s;
      });
    }

    const items = (rawRequests || []).map((row: any) => {
      const student = studentMap[row.child_id] || {};
      return {
        id: String(row.id),
        childId: String(row.child_id ?? ""),
        childName: String(student.student_name ?? student.name ?? row.child_name ?? ""), 
        campus: String(student.campus ?? row.campus ?? ""),
        className: String(student.class_name ?? student.className ?? ""),
        type: String(row.type ?? ""),
        dateStart: String(row.date_start ?? ""),
        dateEnd: row.date_end ? String(row.date_end) : undefined,
        time: row.time ? String(row.time) : undefined,
        note: row.note ? String(row.note) : undefined,
        changeType: row.change_type ? String(row.change_type) : undefined,
        medName: row.med_name ? String(row.med_name) : undefined,
        createdAt: String(row.created_at ?? new Date().toISOString()),
        name: row.name ? String(row.name) : undefined,
        phone: row.phone ? String(row.phone) : undefined,
        source: row.source ? String(row.source) : undefined,
        status: row.status ? String(row.status) : undefined,
        teacherRead: typeof row.teacher_read === "boolean" ? row.teacher_read : undefined,
      };
    });

    return json({ ok: true, items }, 200);
  } catch (e) {
    console.error("GET REQUESTS ERROR", e);
    return json({ ok: false }, 500);
  }
}
