import { type NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { bulkPhotoDeleteSchema } from "@/lib/api/validation";
import { requireAuth } from "@/lib/auth/context";
import { deletePhotosFromCloudinary } from "@/lib/cloudinary/core";
import { prisma } from "@/lib/db";

/**
 * POST /api/admin/galleries/[id]/photos/bulk
 * 
 * Bulk delete multiple photos from gallery and Cloudinary.
 * Uses batch API for efficient Cloudinary deletion.
 * 
 * Request body:
 * {
 *   photoIds: string[],    // Array of photo IDs to delete
 *   action: "delete"       // Must be "delete"
 * }
 * 
 * @param request - HTTP request with JSON body
 * @param params - Route parameters containing galleryId
 * @returns NextResponse with deletion summary (deleted count, failures)
 * 
 * Security: Vendor isolation enforced via gallery.vendorId check
 * Note: Database cleanup happens regardless of Cloudinary success
 */
export async function POST(
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

    if (!gallery?.vendorId || gallery.vendorId !== user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Forbidden" },
        { status: 403 }
      );
    }

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate request body with Zod
    const parsed = bulkPhotoDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { photoIds } = parsed.data;

    // Get photos to delete (verify they belong to this gallery)
    const photosToDelete = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        galleryId: galleryId
      },
      select: { id: true, storageKey: true }
    });

    if (photosToDelete.length !== photoIds.length) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: `Some photos not found or don't belong to this gallery`
        },
        { status: 404 }
      );
    }

    // Delete dari Cloudinary menggunakan batch API dengan gallery vendorId (verified ownership)
    const cloudinaryResult = await deletePhotosFromCloudinary(
      gallery.vendorId,
      photosToDelete.map(p => p.storageKey)
    );
    
    const cloudinaryErrors = cloudinaryResult.failed.map(f => ({
      photoId: photosToDelete.find(p => p.storageKey === f.publicId)?.id ?? f.publicId,
      error: f.error
    }));

    // Delete dari database (regardless of Cloudinary success)
    const dbResult = await prisma.photo.deleteMany({
      where: {
        id: { in: photoIds },
        galleryId: galleryId
      }
    });

    // Return response
    const message = cloudinaryErrors.length > 0
      ? `Deleted ${dbResult.count} photo(s) (${cloudinaryErrors.length} Cloudinary delete failed, but DB cleaned)`
      : `Deleted ${dbResult.count} photo(s)`;

    const responseData = {
      code: "OK",
      message,
      deletedCount: dbResult.count,
      failedCount: cloudinaryErrors.length,
      ...(cloudinaryErrors.length > 0 ? { cloudinaryErrors } : {})
    };

    return NextResponse.json(responseData, { status: 200 });
   } catch (error) {
     return handleApiError(error);
   }
}
