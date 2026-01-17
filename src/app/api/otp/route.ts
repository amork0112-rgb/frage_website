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

      console.log("[OTP][input]", {
        rawPhone,
        rawDigits,
      });

      const { data: parent, error: parentErr } = await supabaseService
        .from("parents")
        .select("id,parent_name,phone,phone_digits,auth_user_id")
        .eq("phone_digits", rawDigits)
        .maybeSingle();

      console.log("[OTP][parents]", {
        error: parentErr,
        parent,
      });

      if (!parent) {
        return json(
          { ok: false, error: "no_registered_student" },
          404
        );
      }

      if (parent.auth_user_id) {
        return json(
          { ok: false, error: "already_has_account" },
          409
        );
      }

      const parentId = String(parent.id);

      const { count: studentCount, error: studentErr } = await supabaseService
        .from("v_students_full")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", parentId);

      console.log("[OTP][students count]", {
        parentId,
        error: studentErr,
        count: studentCount ?? 0,
      });

      if (!studentCount || studentCount === 0) {
        return json(
          { ok: false, error: "no_registered_student" },
          404
        );
      }

      const code = generateOtpCode();
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();

      console.log("[OTP][issue]", {
        parentId,
        phoneNorm,
        expiresAt,
      });

      const DEBUG_PHONES = ["01064227116"];

      if (
        process.env.NODE_ENV !== "production" ||
        DEBUG_PHONES.includes(rawDigits)
      ) {
        console.log("[OTP DEBUG CODE]", code);
        await supabaseService
          .from("parent_otps")
          .insert({
            parent_id: parent.id,
            code,
            expires_at: expiresAt,
            used: false,
          });
        return json({ ok: true, debugCode: code });
      }

      await supabaseService
        .from("parent_otps")
        .insert({
          parent_id: parent.id,
          code,
          expires_at: expiresAt,
          used: false,
        });

      return json({ ok: true });
    }

    if (mode === "verify") {
      const rawPhone = String((body as any).phone || "");
      const rawDigits = rawPhone.replace(/\D/g, "");
      const rawCode = String((body as any).code || "").trim();

      if (!rawDigits || !rawCode) {
        return json({ ok: false, error: "phone_or_code_missing" }, 400);
      }

      const { data: parent, error: parentErr } = await supabaseService
        .from("parents")
        .select("id,parent_name,phone")
        .eq("phone_digits", rawDigits)
        .maybeSingle();

      if (parentErr || !parent) {
        return json(
          { ok: false, error: "no_registered_student" },
          404
        );
      }

      const parentId = String(parent.id);
      const nowIso = new Date().toISOString();

      console.log("[OTP][verify input]", {
        phone: rawPhone,
        code: rawCode,
        parentId,
      });

      const { data: otpRow, error: otpErr } = await supabaseService
        .from("parent_otps")
        .select("id,parent_id,code,expires_at,used")
        .eq("parent_id", parentId)
        .eq("code", rawCode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("[OTP][verify result]", {
        otpRow,
        error: otpErr,
      });

      if (otpErr || !otpRow) {
        return json({ ok: false, error: "invalid_otp" }, 400);
      }

      if (otpRow.used) {
        return json({ ok: false, error: "invalid_otp" }, 400);
      }

      if (otpRow.expires_at && otpRow.expires_at < nowIso) {
        return json({ ok: false, error: "expired" }, 400);
      }

      // 1. 먼저 학생 정보 조회 (검증)
      const { data: students, error: studentsErr } = await supabaseService
        .from("v_students_full")
        .select("*")
        .eq("parent_id", parentId);

      console.log("[OTP][students check]", {
        parentId,
        count: students?.length,
        error: studentsErr,
      });

      const children = Array.isArray(students)
        ? students.map((s: any) => ({
            id: String(s.id || s.student_id || ""),
            name: String(s.student_name || ""),
            englishName: String(s.english_first_name || ""),
            campus: String(s.campus || ""),
            className: String(s.class_name || "-"),
            status: String(s.status || ""),
          }))
        : [];

      if (children.length === 0) {
        // 학생이 없으면 OTP를 사용 처리하지 않음 (그래야 상담실 문의 후 다시 시도 가능 or 데이터 오류 수정 후 재시도 가능)
        console.log("[OTP][error] no students found for parent", parentId);
        return json(
          { ok: false, error: "no_registered_student" },
          404
        );
      }

      // 2. 모든 검증 통과 후 used 처리
      await supabaseService
        .from("parent_otps")
        .update({ used: true, verified_at: new Date().toISOString() })
        .eq("id", otpRow.id);

      return json({
        ok: true,
        parentId: String(parentId),
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
