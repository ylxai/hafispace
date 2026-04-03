import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { requireAuth } from "@/lib/auth/context";
import { getCachedVendorMetrics } from "@/lib/services/metrics.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const data = await getCachedVendorMetrics(user.id);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
