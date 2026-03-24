import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { deletePhotosFromCloudinary } from "@/lib/cloudinary/core";

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: galleryId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify gallery ownership
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { vendorId: true }
    });

    if (gallery?.vendorId !== session.user.id) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Forbidden" },
        { status: 403 }
      );
    }

    // Parse request body
    interface BulkDeleteRequest {
      photoIds: string[];
      action: string;
    }
    const body = await request.json() as BulkDeleteRequest;
    const { photoIds, action } = body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "photoIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (action !== "delete") {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Invalid action" },
        { status: 400 }
      );
    }

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
    console.error("POST /api/admin/galleries/[id]/photos/bulk:", error);
    return NextResponse.json(
      {
        code: "ERROR",
        message: "Failed to delete photos"
      },
      { status: 500 }
    );
  }
}
