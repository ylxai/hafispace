import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { notFoundResponse, validationErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { listPhotosFromCloudinary, uploadPhotoToCloudinary } from "@/lib/cloudinary";
import { CLOUDINARY_FOLDERS } from "@/lib/cloudinary/constants";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";

// Retry mechanism untuk handle race condition pada urutan (P2002 unique constraint)
async function createPhotoWithRetry(
  galleryId: string,
  data: {
    storageKey: string;
    filename: string;
    url: string;
    thumbnailUrl: string;
    width: number;
    height: number;
    size: number;
    mimeType: string;
  },
  attempt = 0
) {
  try {
    const maxUrutan = await prisma.photo.aggregate({
      where: { galleryId },
      _max: { urutan: true },
    });
    const nextUrutan = (maxUrutan._max.urutan ?? -1) + 1;

    return await prisma.photo.create({
      data: { galleryId, ...data, urutan: nextUrutan },
      select: { id: true, storageKey: true, filename: true, url: true, thumbnailUrl: true, width: true, height: true, size: true, mimeType: true },
    });
  } catch (error: unknown) {
    // Retry on unique constraint violation (P2002) — max 3 attempts
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002" &&
      attempt < 3
    ) {
      logger.warn({ galleryId, attempt }, "Retrying photo create due to urutan conflict");
      return createPhotoWithRetry(galleryId, data, attempt + 1);
    }
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: galleryId } = await params;

    // Verify that the gallery belongs to the current vendor
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId, vendorId: user.id },
    });

    if (!gallery) {
      return notFoundResponse("Gallery not found or doesn't belong to current vendor");
    }

    // Check if the request is multipart/form-data for file upload
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return validationErrorResponse("Content-Type must be multipart/form-data");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return validationErrorResponse("No file provided");
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudinary
    const result = await uploadPhotoToCloudinary(user.id, buffer, file.name, {
      folder: `${CLOUDINARY_FOLDERS.GALLERIES}/${user.id}/${galleryId}`,
      resourceType: "image",
    });

    // Save photo record to database with retry on urutan conflict
    const photo = await createPhotoWithRetry(gallery.id, {
      storageKey: result.publicId,
      filename: file.name,
      url: result.secureUrl,
      thumbnailUrl: result.secureUrl,
      width: result.width ?? 0,
      height: result.height ?? 0,
      size: result.size ?? 0,
      mimeType: file.type || `image/${result.format}`,
    });

    return NextResponse.json({
      message: "Photo uploaded successfully",
      photo,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Endpoint to sync photos from Cloudinary folder to database
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: galleryId } = await params;

    // Verify that the gallery belongs to the current vendor
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId, vendorId: user.id },
    });

    if (!gallery) {
      return notFoundResponse("Gallery not found or doesn't belong to current vendor");
    }

    // Fetch photos from Cloudinary folder
    const cloudinaryResult = await listPhotosFromCloudinary(user.id, {
      folder: `${CLOUDINARY_FOLDERS.GALLERIES}/${user.id}/${galleryId}`,
    });

    // Sync photos to database
    const existingKeys = new Set(
      (
        await prisma.photo.findMany({
          where: { galleryId: gallery.id },
          select: { storageKey: true },
        })
      ).map((p) => p.storageKey)
    );

    const newPhotos = cloudinaryResult.items.filter(
      (p) => !existingKeys.has(p.publicId)
    );

    if (newPhotos.length > 0) {
      // Atomic transaction untuk hindari race condition urutan saat sync concurrent
      await prisma.$transaction(async (tx) => {
        const maxUrutan = await tx.photo.aggregate({
          where: { galleryId: gallery.id },
          _max: { urutan: true },
        });
        let nextUrutan = (maxUrutan._max.urutan ?? -1) + 1;

        await tx.photo.createMany({
          data: newPhotos.map((p) => ({
            galleryId: gallery.id,
            storageKey: p.publicId,
            filename: p.originalFilename,
            url: p.secureUrl,
            thumbnailUrl: p.secureUrl,
            width: p.width,
            height: p.height,
            size: p.size,
            mimeType: `image/${p.format}`,
            urutan: nextUrutan++,
          })),
          skipDuplicates: true,
        });
      });
    }

    // Get updated photo count
    const photoCount = await prisma.photo.count({
      where: { galleryId: gallery.id },
    });

    return NextResponse.json({
      message: "Photos synced successfully",
      photoCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
