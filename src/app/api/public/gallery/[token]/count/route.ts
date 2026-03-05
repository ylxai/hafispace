import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSelectionCount } from "@/lib/selection-counter";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
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
}
