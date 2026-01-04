import { getUserFromSession } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campus = searchParams.get("campus");

  // DB에서 campus 기준 fetch
  return Response.json([]);
}

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (user.role !== "master_teacher") {
    return new Response("Forbidden", { status: 403 });
  }

  // create logic
}
