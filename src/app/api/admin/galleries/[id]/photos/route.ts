import { type NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

// GET all photos from gallery
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: galleryId } = await params;

  try {
    const user = await requireAuth(request);

    // Verify gallery ownership
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { vendorId: true }
    });

    if (gallery?.vendorId !== user.id) {
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
     return handleApiError(error);
   }
}

// DELETE dan PATCH handlers dipindahkan ke:
// - DELETE single photo: src/app/api/admin/galleries/[id]/photos/[photoId]/route.ts
// - PATCH bulk delete: src/app/api/admin/galleries/[id]/photos/bulk/route.ts
