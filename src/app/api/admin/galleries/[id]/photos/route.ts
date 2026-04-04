import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { notFoundResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

const PHOTOS_PER_PAGE = 100;

// GET all photos from gallery with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: galleryId } = await params;

    // Verify gallery ownership — return 404 jika tidak ada, 403 jika bukan milik vendor
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { vendorId: true },
    });

    if (!gallery) {
      return notFoundResponse("Gallery not found");
    }

    if (gallery.vendorId !== user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Forbidden" },
        { status: 403 }
      );
    }

    // Pagination via cursor (lebih efisien dari offset untuk large galleries)
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") ?? String(PHOTOS_PER_PAGE), 10),
      PHOTOS_PER_PAGE
    );

    const photos = await prisma.photo.findMany({
      where: { galleryId },
      select: {
        id: true,
        filename: true,
        url: true,
        width: true,
        height: true,
        urutan: true,
        createdAt: true,
      },
      orderBy: { urutan: "asc" },
      take: limit + 1, // fetch satu extra untuk detect hasNextPage
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasNextPage = photos.length > limit;
    const items = hasNextPage ? photos.slice(0, limit) : photos;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      code: "OK",
      message: "Photos retrieved successfully",
      photos: items,
      pagination: {
        hasNextPage,
        nextCursor,
        limit,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE dan PATCH handlers dipindahkan ke:
// - DELETE single photo: src/app/api/admin/galleries/[id]/photos/[photoId]/route.ts
// - PATCH bulk delete: src/app/api/admin/galleries/[id]/photos/bulk/route.ts
