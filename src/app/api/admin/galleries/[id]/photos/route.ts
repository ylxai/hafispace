import { NextResponse } from "next/server";

import { unauthorizedResponse } from "@/lib/api/response";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";

// GET all photos from gallery
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: galleryId } = await params;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    // Verify gallery ownership
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { vendorId: true }
    });

    if (gallery?.vendorId !== session.user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Forbidden" },
        { status: 403 }
      );
    }

    // Get all photos ordered by urutan
    const photos = await prisma.photo.findMany({
      where: { galleryId },
      select: {
        id: true,
        filename: true,
        url: true,
        width: true,
        height: true,
        createdAt: true
      },
      orderBy: { urutan: "asc" }
    });

    return NextResponse.json({
      code: "OK",
      message: "Photos retrieved successfully",
      photos
    }, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "GET /api/admin/galleries/[id]/photos");
    return NextResponse.json(
      { code: "ERROR", message: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}

// DELETE dan PATCH handlers dipindahkan ke:
// - DELETE single photo: src/app/api/admin/galleries/[id]/photos/[photoId]/route.ts
// - PATCH bulk delete: src/app/api/admin/galleries/[id]/photos/bulk/route.ts
