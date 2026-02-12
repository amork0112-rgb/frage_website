export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import crypto from "crypto";

async function sendKakaoAlimtalk(phone: string, code: string) {
  console.log("[SOLAPI] sendKakaoAlimtalk CALLED", {
    phone,
    code,
  });

  const apiKey = process.env.SOLAPI_API_KEY!;
  const apiSecret = process.env.SOLAPI_API_SECRET!;
  const pfId = process.env.KAKAO_PF_ID!;
  const templateId = process.env.SOLAPI_KAKAO_TEMPLATE_OTP!;
  const from = process.env.SOLAPI_SENDER!;

  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");

  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");

  const authHeader = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

  console.log("[ALIMTALK PAYLOAD]", {
    pfId,
    templateId,
    variables: {
      code,
    },
  });

  console.log("[SOLAPI] before fetch");
  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        to: phone.replace(/\D/g, ""),
        from: from,
        type: "ATA",
        kakaoOptions: {
          pfId,
          templateId,
          variables: {
            code: code,
          },
        },
      },
    }),
  });
  console.log("[SOLAPI] after fetch", res.status);

  const text = await res.text();
  console.log("[SOLAPI RESPONSE BODY]", text);

  if (!res.ok) {
    throw new Error("alimtalk_failed");
  }
}

async function sendSms(phone: string, text: string) {
  console.log("[SOLAPI] sendSms CALLED", { phone });

  const apiKey = process.env.SOLAPI_API_KEY!;
  const apiSecret = process.env.SOLAPI_API_SECRET!;
  const from = process.env.SOLAPI_SENDER!;

  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");

  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");

  const authHeader = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

  console.log("[SOLAPI SMS] before fetch");
  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        to: phone.replace(/\D/g, ""),
        from: from,
        text: text,
        type: "SMS",
      },
    }),
  });
  console.log("[SOLAPI SMS] after fetch", res.status);

  const resText = await res.text();
  console.log("[SOLAPI SMS RESPONSE BODY]", resText);

  if (!res.ok) {
    throw new Error("sms_failed");
  }
}

type Mode = "request" | "verify" | "complete" | "onboarding";

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
    }
  | {
      mode: "onboarding";
      parentId: string;
      use_bus: boolean;
      commute_type: string;
      address?: string | null;
      arrival_method?: "shuttle" | "academy" | "self";
      departure_method?: "shuttle" | "academy" | "self";
      pickup_lat?: number | null;
      pickup_lng?: number | null;
      dropoff_lat?: number | null;
      dropoff_lng?: number | null;
      pickup_place?: string | null;
      dropoff_place?: string | null;
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
  console.log("[SOLAPI ENV CHECK]", {
    key: !!process.env.SOLAPI_API_KEY,
    secret: !!process.env.SOLAPI_API_SECRET,
    pfId: process.env.KAKAO_PF_ID,
    template: process.env.SOLAPI_KAKAO_TEMPLATE_OTP,
  });

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

      await supabaseService
        .from("parent_otps")
        .insert({
          parent_id: parent.id,
          code,
          expires_at: expiresAt,
          used: false,
        });

      try {
        await sendKakaoAlimtalk(rawDigits, code);
      } catch (e) {
        console.log("Alimtalk failed → SMS fallback", e);
        try {
          await sendSms(
            rawDigits,
            `FRAGE 인증번호는 ${code} 입니다. (3분 이내 입력)`
          );
        } catch (smsErr) {
          console.error("SMS Fallback also failed:", smsErr);
          // 여기서 에러를 리턴할지 말지는 정책에 따라 다르지만, 
          // 최소한 알림은 가야 하므로 에러를 리턴하는 것이 좋습니다.
          return json({ ok: false, error: "send_failed" }, 500);
        }
      }

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
            id: String(s.student_id || ""),
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

      await supabaseService
        .from("parents")
        .update({ auth_user_id: user.id })
        .eq("id", parentId);

      await supabaseService
        .from("students")
        .update({ parent_auth_user_id: user.id, onboarding_step: "transport" })
        .eq("parent_id", parentId);

      return json({ ok: true });
    }

    if (mode === "onboarding") {
      const parentId = String((body as any).parentId || "");
      if (!parentId) {
        return json({ ok: false, error: "parent_id_required" }, 400);
      }

      const useBus =
        typeof (body as any).use_bus === "boolean" ? (body as any).use_bus : null;
      const commuteRaw = String((body as any).commute_type || "").trim();
      const address =
        typeof (body as any).address === "string"
          ? String((body as any).address)
          : null;

      if (useBus === null) {
        return json({ ok: false, error: "use_bus_required" }, 400);
      }

      if (!commuteRaw) {
        return json({ ok: false, error: "commute_type_required" }, 400);
      }

      if (useBus === true && (!address || address.trim().length === 0)) {
        return json({ ok: false, error: "address_required" }, 400);
      }

      const arrivalMethodRaw = String((body as any).arrival_method || "").trim();
      const departureMethodRaw = String(
        (body as any).departure_method || ""
      ).trim();

      let pickupType: "bus" | "self" | null = null;
      let dropoffType: "bus" | "self" | null = null;

      const arrivalNormalized =
        arrivalMethodRaw === "guardian" ? "academy" : arrivalMethodRaw;
      const departureNormalized =
        departureMethodRaw === "guardian" ? "academy" : departureMethodRaw;

      if (arrivalNormalized === "shuttle") {
        pickupType = "bus";
      } else if (arrivalNormalized === "academy" || arrivalNormalized === "self") {
        pickupType = "self";
      }

      if (departureNormalized === "shuttle") {
        dropoffType = "bus";
      } else if (
        departureNormalized === "academy" ||
        departureNormalized === "self"
      ) {
        dropoffType = "self";
      }

      const commuteType = commuteRaw === "bus" ? "bus" : "self";

      if (!pickupType) {
        pickupType = commuteType;
      }
      if (!dropoffType) {
        dropoffType = commuteType;
      }

      const pickupLatRaw = (body as any).pickup_lat;
      const pickupLngRaw = (body as any).pickup_lng;
      const dropoffLatRaw = (body as any).dropoff_lat;
      const dropoffLngRaw = (body as any).dropoff_lng;

      const pickupLat =
        typeof pickupLatRaw === "number"
          ? pickupLatRaw
          : pickupLatRaw != null
          ? Number.parseFloat(String(pickupLatRaw))
          : null;
      const pickupLng =
        typeof pickupLngRaw === "number"
          ? pickupLngRaw
          : pickupLngRaw != null
          ? Number.parseFloat(String(pickupLngRaw))
          : null;
      const dropoffLat =
        typeof dropoffLatRaw === "number"
          ? dropoffLatRaw
          : dropoffLatRaw != null
          ? Number.parseFloat(String(dropoffLatRaw))
          : null;
      const dropoffLng =
        typeof dropoffLngRaw === "number"
          ? dropoffLngRaw
          : dropoffLngRaw != null
          ? Number.parseFloat(String(dropoffLngRaw))
          : null;

      const { data: students, error: studentsErr } = await supabaseService
        .from("students")
        .select("id,parent_id")
        .eq("parent_id", parentId);

      if (studentsErr) {
        return json({ ok: false, error: "students_fetch_failed" }, 500);
      }

      if (!students || students.length === 0) {
        return json(
          { ok: false, error: "no_registered_student" },
          404
        );
      }

      const payload: Record<string, any> = {
        use_bus: useBus,
        address: address && address.trim().length > 0 ? address.trim() : null,
        profile_completed: true,
      };

      if (pickupType) {
        payload.pickup_type = pickupType;
      }
      if (dropoffType) {
        payload.dropoff_type = dropoffType;
      }

      if (
        pickupType === "bus" &&
        typeof pickupLat === "number" &&
        !Number.isNaN(pickupLat) &&
        typeof pickupLng === "number" &&
        !Number.isNaN(pickupLng)
      ) {
        payload.pickup_lat = pickupLat;
        payload.pickup_lng = pickupLng;
      }

      if (
        dropoffType === "bus" &&
        typeof dropoffLat === "number" &&
        !Number.isNaN(dropoffLat) &&
        typeof dropoffLng === "number" &&
        !Number.isNaN(dropoffLng)
      ) {
        payload.dropoff_lat = dropoffLat;
        payload.dropoff_lng = dropoffLng;
      }

      const { error: updateErr } = await supabaseService
        .from("students")
        .update(payload)
        .eq("parent_id", parentId);

      if (updateErr) {
        return json({ ok: false, error: "update_failed" }, 500);
      }

      return json({ ok: true });
    }

    return json({ ok: false, error: "unsupported_mode" }, 400);
  } catch {
    return json({ ok: false, error: "server_error" }, 500);
  }
}
