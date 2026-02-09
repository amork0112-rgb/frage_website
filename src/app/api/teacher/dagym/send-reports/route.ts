
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import admin from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

/**
 * 📌 Push Sending Helper
 * Sends FCM notification to specific tokens.
 */
async function sendFCMPush(tokens: string[], payload: { title: string; body: string; link: string }) {
  try {
    const message = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        link: payload.link,
      },
    };

    const res = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Sent batch: ${res.successCount} success, ${res.failureCount} failed`);
    return res;
  } catch (error) {
    console.error(`[FCM] Failed to send batch`, error);
    return { successCount: 0, failureCount: tokens.length, responses: [] };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { class_id, date } = body;

    if (!class_id || !date) {
      return NextResponse.json({ error: "Missing class_id or date" }, { status: 400 });
    }

    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    // 1️⃣ Authorization
    // Allow: teacher, master_teacher, admin
    // Block: parent
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role || "";
    const allowedRoles = ["teacher", "master_teacher", "admin"];
    
    if (!allowedRoles.includes(role)) {
       // Fallback: Check teachers table if app_metadata is not set (legacy support)
       const { data: teacher } = await supabaseService
        .from("teachers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

       if (!teacher) {
         return NextResponse.json({ error: "Forbidden: Teachers only" }, { status: 403 });
       }
    }

    // 2️⃣ Fetch target students
    // Conditions: main_class = class_id AND dajim_enabled = true
    const { data: students, error: studentError } = await supabaseService
      .from("students")
      .select("id, student_name, parent_auth_user_id")
      .eq("main_class", class_id)
      .eq("dajim_enabled", true);

    if (studentError) {
      console.error("Failed to fetch students:", studentError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ ok: true, sent_count: 0, push_sent: 0, push_failed: 0 });
    }

    const now = new Date().toISOString();

    // 3️⃣ Upsert daily_reports (MANDATORY)
    // send_status = 'sent' (Portal Visibility ON)
    // push_status = 'pending'
    const reports = students.map(s => ({
      student_id: s.id,
      class_id,
      date,
      send_status: "sent",
      sent_at: now,
      push_status: "pending", // Initial state
      updated_at: now
    }));

    const { error: upsertError } = await supabaseService
      .from("daily_reports")
      .upsert(reports, { onConflict: "student_id,class_id,date" });

    if (upsertError) {
      console.error("Failed to upsert reports:", upsertError);
      return NextResponse.json({ error: "Failed to save reports" }, { status: 500 });
    }

    // 4️⃣ IMMEDIATELY SEND PUSH NOTIFICATION
    // Fetch tokens and send in parallel
    let pushSentCount = 0;
    let pushFailedCount = 0;
    const pushUpdates: { student_id: string; push_status: string; push_sent_at?: string }[] = [];

    await Promise.all(students.map(async (student) => {
      if (!student.parent_auth_user_id) {
        pushFailedCount++;
        pushUpdates.push({ student_id: student.id, push_status: "failed" }); // No parent linked
        return;
      }

      // Fetch Parent FCM Token
      // Assuming 'user_push_tokens' table exists: user_id, token
      const { data: tokens } = await supabaseService
        .from("user_push_tokens")
        .select("token")
        .eq("user_id", student.parent_auth_user_id);

      if (!tokens || tokens.length === 0) {
        pushFailedCount++;
        pushUpdates.push({ student_id: student.id, push_status: "failed" }); // No token found
        return;
      }

      // Send to all tokens for this parent
      const tokenStrings = tokens.map(t => t.token);
      const result = await sendFCMPush(tokenStrings, {
        title: "✨ 작은 다짐이 큰 성장을 만듭니다",
        body: `오늘 ${student.student_name} 학생의 다짐 결과를 확인해 주세요.`,
        link: `/portal/dajim?date=${date}`
      });

      const isSuccess = result.successCount > 0;

      if (isSuccess) {
        pushSentCount++;
        pushUpdates.push({ 
          student_id: student.id, 
          push_status: "sent", 
          push_sent_at: new Date().toISOString() 
        });
      } else {
        pushFailedCount++;
        pushUpdates.push({ student_id: student.id, push_status: "failed" });
      }
    }));

    // 5️⃣ Update push_status
    // We update individually or in bulk. Bulk is better but requires constructing the query carefully.
    // For simplicity and safety with upsert, we re-upsert with just the status fields.
    // Note: upsert requires all primary keys / unique constraints.
    
    const updatePayloads = pushUpdates.map(u => ({
      student_id: u.student_id,
      class_id,
      date,
      push_status: u.push_status,
      push_sent_at: u.push_sent_at,
      updated_at: new Date().toISOString()
      // send_status is NOT changed here, preserving 'sent'
    }));

    if (updatePayloads.length > 0) {
        const { error: updateError } = await supabaseService
        .from("daily_reports")
        .upsert(updatePayloads, { onConflict: "student_id,class_id,date" });
        
        if (updateError) {
            console.error("Failed to update push status:", updateError);
            // We do NOT return error here, as the primary goal (send_status) was achieved.
        }
    }

    return NextResponse.json({
      ok: true,
      sent_count: students.length,
      push_sent: pushSentCount,
      push_failed: pushFailedCount
    });

  } catch (err) {
    console.error("🔥 SEND REPORTS API ERROR", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
