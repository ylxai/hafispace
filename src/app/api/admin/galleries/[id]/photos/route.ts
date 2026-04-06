import type { NextRequest } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { forbiddenResponse, notFoundResponse, validationErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

const PHOTOS_PER_PAGE = 100;

// Query param schema untuk pagination
const paginationSchema = z.object({
  cursor: z.string().uuid("cursor must be a valid UUID").optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : PHOTOS_PER_PAGE))
    .pipe(z.number().int().min(1).max(PHOTOS_PER_PAGE)),
});

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
      return forbiddenResponse();
    }

    // Validate & parse query params via Zod — prevents NaN/invalid UUID errors
    const url = new URL(request.url);
    const rawParams = {
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const parsed = paginationSchema.safeParse(rawParams);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.format());
    }
    const { cursor, limit } = parsed.data;

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
      // Deterministic sort: urutan bisa sama, id selalu unique
      orderBy: [{ urutan: "asc" }, { id: "asc" }],
      take: limit + 1, // fetch satu extra untuk detect hasNextPage
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasNextPage = photos.length > limit;
    const items = hasNextPage ? photos.slice(0, limit) : photos;
    const nextCursor = hasNextPage ? (items[items.length - 1]?.id ?? null) : null;

    return Response.json({
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
