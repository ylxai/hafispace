import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { gallerySchema } from "@/lib/api/validation";
import { unauthorizedResponse, validationErrorResponse, notFoundResponse, parseAndValidate } from "@/lib/api/response";
import { parsePaginationParams, createPaginationResponse } from "@/lib/api/pagination";
// verifyGalleryOwnership tidak diperlukan di route ini — DELETE menggunakan manual query
// karena perlu mengambil _count.photos dalam satu roundtrip yang sama

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePaginationParams(searchParams);

  const [galleries, total] = await Promise.all([
    prisma.gallery.findMany({
      where: { vendorId: session.user.id },
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
      where: { vendorId: session.user.id },
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
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

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
    where: { id: bookingId, vendorId: session.user.id },
    select: { id: true },
  });
  if (!booking) return notFoundResponse("Booking not found");

  const clientToken = crypto.randomUUID();

  const gallery = await prisma.gallery.create({
    data: {
      vendorId: session.user.id,
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
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const galleryId = searchParams.get("id");

  if (!galleryId) {
    return validationErrorResponse("Gallery ID is required");
  }

  // Verifikasi ownership dan cek photo count dalam satu query
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId, vendorId: session.user.id },
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
    where: { id: galleryId, vendorId: session.user.id },
  });

  return NextResponse.json({ 
    success: true, 
    message: "Gallery deleted successfully" 
  });
}
