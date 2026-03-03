import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { gallerySchema } from "@/lib/api/validation";
import { unauthorizedResponse, validationErrorResponse } from "@/lib/api/response";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const galleries = await prisma.gallery.findMany({
    where: { vendorId: session.user.id },
    include: {
      booking: true,
      _count: {
        select: { photos: true, selections: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = galleries.map((gallery) => ({
    id: gallery.id,
    namaProject: gallery.namaProject,
    status: gallery.status,
    clientToken: gallery.clientToken,
    viewCount: gallery.viewCount,
    photoCount: gallery._count.photos, // Get photo count from associated photos
    selectionCount: gallery._count.selections,
    clientName: gallery.booking?.namaClient ?? "Unknown",
    storageProvider: gallery.storageProvider,
    createdAt: gallery.createdAt.toISOString(),
  }));

  return NextResponse.json({ items: formatted });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parsed = gallerySchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse(parsed.error.format());
  }

  const {
    namaProject,
    bookingId,
    cloudinaryFolderId,
    enableDownload,
    enablePrint,
  } = parsed.data;

  // Generate unique token for client access
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
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Gallery ID is required" },
      { status: 400 }
    );
  }

  // Verify gallery belongs to vendor
  const gallery = await prisma.gallery.findFirst({
    where: {
      id: galleryId,
      vendorId: session.user.id,
    },
    include: {
      _count: {
        select: { photos: true, selections: true },
      },
    },
  });

  if (!gallery) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Gallery not found" },
      { status: 404 }
    );
  }

  // Check if gallery has photos
  if (gallery._count.photos > 0) {
    return NextResponse.json(
      { 
        code: "HAS_PHOTOS", 
        message: `Cannot delete gallery with ${gallery._count.photos} photo(s). Delete photos first.` 
      },
      { status: 400 }
    );
  }

  // Delete gallery (selections will be cascade deleted)
  await prisma.gallery.delete({
    where: { id: galleryId },
  });

  return NextResponse.json({ 
    success: true, 
    message: "Gallery deleted successfully" 
  });
}
