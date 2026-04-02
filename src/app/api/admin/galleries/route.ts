import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { createPaginationResponse, parsePaginationParams } from "@/lib/api/pagination";
import { notFoundResponse, parseAndValidate, validationErrorResponse } from "@/lib/api/response";
import { gallerySchema } from "@/lib/api/validation";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    const [galleries, total] = await Promise.all([
      prisma.gallery.findMany({
        where: { vendorId: user.id },
        include: {
          booking: true,
          _count: {
            select: { photos: true, selections: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.gallery.count({
        where: { vendorId: user.id },
      }),
    ]);

    const formatted = galleries.map((gallery) => ({
      id: gallery.id,
      namaProject: gallery.namaProject,
      status: gallery.status,
      clientToken: gallery.clientToken,
      viewCount: gallery.viewCount,
      photoCount: gallery._count.photos,
      selectionCount: gallery._count.selections,
      clientName: gallery.booking?.namaClient ?? "Unknown",
      storageProvider: gallery.storageProvider,
      createdAt: gallery.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items: formatted,
      pagination: createPaginationResponse(page, limit, total),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await parseAndValidate(request, gallerySchema);
    if (!result.ok) return result.response;

    const {
      namaProject,
      bookingId,
      cloudinaryFolderId,
      enableDownload,
      enablePrint,
    } = result.data;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, vendorId: user.id },
      select: { id: true },
    });
    if (!booking) return notFoundResponse("Booking not found");

    const clientToken = crypto.randomUUID();

    const gallery = await prisma.gallery.create({
      data: {
        vendorId: user.id,
        bookingId,
        namaProject,
        clientToken,
        cloudinaryFolderId,
        storageProvider: "Cloudinary",
        status: "DRAFT",
        settings: {
          create: {
            enableDownload: enableDownload ?? true,
            enablePrint: enablePrint ?? false,
          },
        },
      },
    });

    return NextResponse.json(gallery);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const galleryId = searchParams.get("id");

    if (!galleryId) {
      return validationErrorResponse("Gallery ID is required");
    }

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId, vendorId: user.id },
      select: {
        id: true,
        _count: {
          select: { photos: true },
        },
      },
    });

    if (!gallery) {
      return notFoundResponse("Gallery not found");
    }

    if (gallery._count.photos > 0) {
      return validationErrorResponse(
        `Cannot delete gallery with ${gallery._count.photos} photo(s). Delete photos first.`
      );
    }

    await prisma.gallery.delete({
      where: { id: galleryId, vendorId: user.id },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Gallery deleted successfully" 
    });
  } catch (error) {
    return handleApiError(error);
  }
}
