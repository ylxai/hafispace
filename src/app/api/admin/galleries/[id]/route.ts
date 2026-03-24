import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { uploadPhotoToCloudinary, listPhotosFromCloudinary } from "@/lib/cloudinary";
import { CLOUDINARY_FOLDERS } from "@/lib/cloudinary/constants";
import { unauthorizedResponse, notFoundResponse, validationErrorResponse, internalErrorResponse } from "@/lib/api/response";
import logger from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id: galleryId } = await params;

  try {
    // Verify that the gallery belongs to the current vendor
    const gallery = await prisma.gallery.findUnique({
      where: {
        id: galleryId,
        vendorId: session.user.id,
      },
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
    const result = await uploadPhotoToCloudinary(
      session.user.id,
      buffer,
      file.name,
      {
        folder: `${CLOUDINARY_FOLDERS.GALLERIES}/${session.user.id}/${galleryId}`,
        resourceType: 'image',
      }
    );

    // Calculate proper ordering for new photo
    const maxUrutan = await prisma.photo.aggregate({
      where: { galleryId: gallery.id },
      _max: { urutan: true },
    });
    const nextUrutan = (maxUrutan._max.urutan ?? -1) + 1;

    // Save photo record to database
    const photo = await prisma.photo.create({
      data: {
        galleryId: gallery.id,
        storageKey: result.publicId, // Cloudinary public ID
        filename: file.name,
        url: result.secureUrl,
        thumbnailUrl: result.secureUrl, // Could be a different thumbnail URL if needed
        width: result.width,
        height: result.height,
        size: result.size,
        mimeType: file.type || `image/${result.format}`,
        urutan: nextUrutan, // ✅ Proper ordering based on existing photos
      },
    });

    return NextResponse.json({
      message: "Photo uploaded successfully",
      photo: {
        id: photo.id,
        storageKey: photo.storageKey,
        filename: photo.filename,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        width: photo.width,
        height: photo.height,
        size: photo.size,
        mimeType: photo.mimeType,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error uploading photo to Cloudinary");
    return internalErrorResponse("Failed to upload photo to Cloudinary");
  }
}

// Endpoint to sync photos from Cloudinary folder to database
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id: galleryId } = await params;

  try {
    // Verify that the gallery belongs to the current vendor
    const gallery = await prisma.gallery.findUnique({
      where: {
        id: galleryId,
        vendorId: session.user.id,
      },
    });

    if (!gallery) {
      return notFoundResponse("Gallery not found or doesn't belong to current vendor");
    }

    // Fetch photos from Cloudinary folder
    const cloudinaryResult = await listPhotosFromCloudinary(
      session.user.id,
      {
        folder: `${CLOUDINARY_FOLDERS.GALLERIES}/${session.user.id}/${galleryId}`,
      }
    );

    // Sync photos to database
    const existingKeys = new Set(
      (await prisma.photo.findMany({
        where: { galleryId: gallery.id },
        select: { storageKey: true },
      })).map((p) => p.storageKey)
    );

    const newPhotos = cloudinaryResult.items.filter(
      (p) => !existingKeys.has(p.publicId)
    );

    if (newPhotos.length > 0) {
      const maxUrutan = await prisma.photo.aggregate({
        where: { galleryId: gallery.id },
        _max: { urutan: true },
      });
      let nextUrutan = (maxUrutan._max.urutan ?? -1) + 1;

      await prisma.photo.createMany({
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
    logger.error({ err: error }, "Error syncing photos from Cloudinary");
    return internalErrorResponse("Failed to sync photos from Cloudinary");
  }
}
