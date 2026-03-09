import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { unauthorizedResponse } from "@/lib/api/response";
import { getCachedVendorMetrics } from "@/lib/services/metrics.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const data = await getCachedVendorMetrics(session.user.id);
  return NextResponse.json(data);
}
