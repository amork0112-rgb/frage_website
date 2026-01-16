import { POST as PortalOtpPost } from "@/app/api/portal/otp/route";

export function POST(request: Request) {
  return PortalOtpPost(request);
}

