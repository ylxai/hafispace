import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { getSelectionCount } from "@/lib/selection-counter";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

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
