import { type NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { requireAuth } from "@/lib/auth/context";
import { deletePhotoFromCloudinary } from "@/lib/cloudinary/core";
import { prisma } from "@/lib/db";

/**
 * DELETE /api/admin/galleries/[id]/photos/[photoId]
 * 
 * Delete a single photo from gallery and Cloudinary.
 * Verifies gallery ownership before deletion.
 * 
 * @param _request - HTTP request object
 * @param params - Route parameters containing galleryId and photoId
 * @returns NextResponse with deletion status or error
 * 
 * Security: Vendor isolation enforced via gallery.vendorId check
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id: galleryId, photoId } = await params;
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

    // Get photo details sebelum delete
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { storageKey: true, galleryId: true }
    });

    if (!photo?.galleryId || photo.galleryId !== galleryId) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Photo not found" },
        { status: 404 }
      );
    }

    // Delete dari Cloudinary menggunakan gallery vendorId (verified ownership)
    let cloudinaryError: string | null = null;
    try {
      await deletePhotoFromCloudinary(gallery.vendorId, photo.storageKey);
    } catch (error) {
      cloudinaryError = error instanceof Error ? error.message : "Unknown error";
    }

    // Delete dari database (regardless of Cloudinary success)
    await prisma.photo.delete({
      where: { id: photoId }
    });

    interface SingleDeleteResponse {
      code: string;
      message: string;
      deletedPhotoId: string;
      cloudinaryError?: string;
    }
    const response: SingleDeleteResponse = {
      code: "OK",
      message: "Photo deleted successfully",
      deletedPhotoId: photoId
    };

    if (cloudinaryError) {
      response.cloudinaryError = cloudinaryError;
      response.message += " (database cleaned, but Cloudinary delete failed)";
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
