export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

type Mode = "request" | "verify" | "complete";

type RequestBody =
  | {
      mode: "request";
      phone: string;
    }
  | {
      mode: "verify";
      phone: string;
      code: string;
    }
  | {
      mode: "complete";
      parentId: string;
    };

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function normalizePhone(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  }
  return digits || input.trim();
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RequestBody>;
    const mode = body.mode as Mode | undefined;

    if (!mode) {
      return json({ ok: false, error: "invalid_mode" }, 400);
    }

    if (mode === "request") {
      const rawPhone = String((body as any).phone || "");
      const rawDigits = rawPhone.replace(/\D/g, "");
      const phoneNorm = normalizePhone(rawPhone);
      if (!rawDigits) {
        return json({ ok: false, error: "phone_required" }, 400);
      }

      const { data: parent } = await supabaseService
        .from("parents")
        .select("id,parent_name,phone,auth_user_id,onboarding_completed")
        .eq("phone_digits", rawDigits)
        .maybeSingle();

      if (!parent) {
        return json(
          { ok: false, error: "no_registered_student" },
          404
        );
      }

      if (parent.auth_user_id || parent.onboarding_completed) {
        return json(
          { ok: false, error: "already_has_account" },
          409
        );
      }

      const { data: anyStudent } = await supabaseService
        .from("v_students_full")
        .select("id")
        .eq("parent_id", parent.id)
        .limit(1)
        .maybeSingle();

      if (!anyStudent) {
        return json(
          { ok: false, error: "no_registered_student" },
          404
        );
      }

      const code = generateOtpCode();
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();

      await supabaseService
        .from("parent_otps")
        .insert({
          parent_id: parent.id,
          phone: phoneNorm,
          code,
          expires_at: expiresAt,
          used: false,
          created_at: new Date().toISOString(),
        });

      if (process.env.NODE_ENV !== "production") {
        return json({ ok: true, debugCode: code });
      }

      return json({ ok: true });
    }

    if (mode === "verify") {
      const rawPhone = String((body as any).phone || "");
      const phoneNorm = normalizePhone(rawPhone);
      const rawCode = String((body as any).code || "").trim();

      if (!phoneNorm || !rawCode) {
        return json({ ok: false, error: "phone_or_code_missing" }, 400);
      }

      const nowIso = new Date().toISOString();

      const { data: otpRow, error: otpErr } = await supabaseService
        .from("parent_otps")
        .select("id,parent_id,phone,code,expires_at,used")
        .eq("phone", phoneNorm)
        .eq("code", rawCode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpErr || !otpRow) {
        return json({ ok: false, error: "invalid_otp" }, 400);
      }

      if (otpRow.used) {
        return json({ ok: false, error: "invalid_otp" }, 400);
      }

      if (otpRow.expires_at && otpRow.expires_at < nowIso) {
        return json({ ok: false, error: "expired" }, 400);
      }

      await supabaseService
        .from("parent_otps")
        .update({ used: true, verified_at: new Date().toISOString() })
        .eq("id", otpRow.id);

      const parentId = otpRow.parent_id;

      const { data: parent } = await supabaseService
        .from("parents")
        .select("id,parent_name,phone")
        .eq("id", parentId)
        .maybeSingle();

      if (!parent) {
        return json(
          { ok: false, error: "no_registered_student" },
          404
        );
      }

      const { data: students } = await supabaseService
        .from("v_students_full")
        .select("id,student_name,english_first_name,grade,campus,status")
        .eq("parent_id", parent.id);

      const children = Array.isArray(students)
        ? students.map((s: any) => ({
            id: String(s.id || ""),
            name: String(s.student_name || ""),
            englishName: String(s.english_first_name || ""),
            className: String(s.grade || ""),
            campus: String(s.campus || ""),
            status: String(s.status || ""),
          }))
        : [];

      if (children.length === 0) {
        return json(
          { ok: false, error: "no_registered_student" },
          404
        );
      }

      return json({
        ok: true,
        parentId: String(parent.id),
        parentName: String((parent as any).parent_name || ""),
        children,
      });
    }

    if (mode === "complete") {
      const supabase = createSupabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return json({ ok: false, error: "unauthorized" }, 401);
      }

      const parentId = String((body as any).parentId || "");
      if (!parentId) {
        return json({ ok: false, error: "parent_id_required" }, 400);
      }

      const { data: parent } = await supabaseService
        .from("parents")
        .select("id")
        .eq("id", parentId)
        .maybeSingle();

      if (!parent) {
        return json(
          { ok: false, error: "no_registered_student" },
          404
        );
      }

      try {
        await supabaseService.auth.admin.updateUserById(user.id, {
          app_metadata: { role: "parent" },
        });
      } catch {}

      await supabaseService
        .from("parents")
        .update({ auth_user_id: user.id })
        .eq("id", parentId);

      await supabaseService
        .from("students")
        .update({ parent_auth_user_id: user.id })
        .eq("parent_id", parentId);

      return json({ ok: true });
    }

    return json({ ok: false, error: "unsupported_mode" }, 400);
  } catch {
    return json({ ok: false, error: "server_error" }, 500);
  }
}

