import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { RATE_LIMIT_GALLERY_COUNT_PER_MINUTE } from "@/lib/constants.server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSelectionCount } from "@/lib/selection-counter";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Rate limit: very lenient (300 req/min = 5 req/sec) - real-time counter polling
    const clientIp = getClientIp(_request);
    const rl = await checkRateLimit(`gallery-count:${clientIp}:${token}`, {
      limit: RATE_LIMIT_GALLERY_COUNT_PER_MINUTE,
      windowMs: 60_000,
    });
    if (!rl.success) {
      return NextResponse.json({ count: 0 }); // Graceful degradation, not error
    }

  const gallery = await prisma.gallery.findUnique({
    where: { clientToken: token },
    select: { id: true },
  });

  if (!gallery) {
    return NextResponse.json({ count: 0 });
  }

  // Get count from database (source of truth)
  const count = await getSelectionCount(gallery.id);

  return NextResponse.json({ count });
  } catch (error) {
    return handleApiError(error);
  }
}
