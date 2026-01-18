import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const webhook = process.env.MAKE_WEBHOOK_CONSULTATION;
    if (!webhook) {
      return NextResponse.json({ ok: false, error: "missing_webhook" }, { status: 500 });
    }
    const body = await req.json();
    const payload = {
      message_type: String(body?.message_type || "consultation_confirm"),
      student_id: String(body?.student_id || ""),
      student_name: String(body?.student_name || ""),
      parent_name: String(body?.parent_name || ""),
      phone: String(body?.phone || ""),
      date: String(body?.date || ""),
      time: String(body?.time || ""),
      campus_name: String(body?.campus_name || ""),
      address: String(body?.address || ""),
      contact_phone: String(body?.contact_phone || ""),
    };
    if (!payload.student_id || !payload.phone) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }

    const kakaoPfId = process.env.KAKAO_PF_ID || "";
    const kakaoTemplateId = process.env.KAKAO_TEMPLATE_CONSULT || "";

    const kakaoOptions = {
      pfId: kakaoPfId,
      templateId: kakaoTemplateId,
      variables: {
        student_name: payload.student_name,
        parent_name: payload.parent_name,
        date: payload.date,
        time: payload.time,
        campus_name: payload.campus_name,
        address: payload.address,
        contact_phone: payload.contact_phone,
      },
    };

    const makePayload = {
      ...payload,
      kakaoOptions,
    };

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makePayload),
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false }, { status: 502 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
