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

    // 1. Fetch from View (Preserves existing working logic for Name/Campus)
    const { data: viewData, error: viewError } = await supabaseService
      .from("v_portal_requests_with_student")
      .select("*")
      .order("created_at", { ascending: false });

    if (viewError) {
      // Fallback: If view fails, try raw table
      console.error("VIEW FETCH ERROR", viewError);
      const { data: rawRequests, error: reqError } = await supabaseService
        .from("portal_requests")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (reqError) return json({ ok: true, items: [] }, 200);
      
      // Basic return from raw table if view fails
      return json({ 
        ok: true, 
        items: (rawRequests || []).map((row: any) => ({
          id: String(row.id),
          childId: String(row.child_id ?? ""),
          childName: String(row.child_name ?? ""),
          campus: String(row.campus ?? ""),
          type: String(row.type ?? ""),
          dateStart: String(row.date_start ?? ""),
          dateEnd: row.date_end ? String(row.date_end) : undefined,
          time: row.time ? String(row.time) : undefined,
          note: row.note ? String(row.note) : undefined,
          changeType: row.change_type ? String(row.change_type) : undefined,
          medName: row.med_name ? String(row.med_name) : undefined,
          createdAt: String(row.created_at ?? new Date().toISOString()),
          status: row.status ? String(row.status) : undefined,
          teacherRead: typeof row.teacher_read === "boolean" ? row.teacher_read : undefined,
        }))
      }, 200);
    }

    // 2. Fetch Raw Data for missing fields (Time)
    const { data: rawData } = await supabaseService
      .from("portal_requests")
      .select("id, time, child_id");
    
    const timeMap: Record<string, string> = {};
    const childIdMap: Record<string, string> = {};
    (rawData || []).forEach((r: any) => {
      if (r.time) timeMap[r.id] = r.time;
      if (r.child_id) childIdMap[r.id] = r.child_id;
    });

    // 3. Fetch Class Info (Class Name)
    // Collect student IDs from the view data
    const studentIds = Array.from(new Set((viewData || []).map((r: any) => r.student_id ?? r.child_id ?? childIdMap[r.id]).filter(Boolean)));
    
    let classMap: Record<string, string> = {};
    if (studentIds.length > 0) {
      // Try fetching from v_students_full for class_name
      const { data: students } = await supabaseService
        .from("v_students_full")
        .select("*") // Select all to be safe
        .in("student_id", studentIds);
      
      (students || []).forEach((s: any) => {
        // Map using student_id (or id if student_id is missing)
        const sid = s.student_id ?? s.id;
        if (sid) {
          classMap[sid] = s.class_name ?? s.className ?? "";
        }
      });
    }

    const items = (viewData || []).map((row: any) => {
      const id = String(row.id);
      const studentId = String(row.student_id ?? row.child_id ?? childIdMap[id] ?? "");
      
      return {
        id: id,
        childId: studentId,
        childName: String(row.student_name ?? row.child_name ?? ""),
        campus: String(row.campus ?? ""),
        type: String(row.type ?? ""),
        dateStart: String(row.date_start ?? ""),
        dateEnd: row.date_end ? String(row.date_end) : undefined,
        
        // Enrich Time: Prefer raw table time, fallback to view time
        time: timeMap[id] ? String(timeMap[id]) : (row.time ? String(row.time) : undefined),
        
        note: row.note ? String(row.note) : undefined,
        changeType: row.change_type ? String(row.change_type) : undefined,
        medName: row.med_name ? String(row.med_name) : undefined,
        createdAt: String(row.created_at ?? new Date().toISOString()),
        
        // Enrich Class: Prefer joined class name, fallback to view class name
        className: classMap[studentId] ? String(classMap[studentId]) : (row.class_name ? String(row.class_name) : undefined),
        
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
