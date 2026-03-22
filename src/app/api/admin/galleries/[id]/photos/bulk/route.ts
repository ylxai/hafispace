import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { deletePhotoFromCloudinary } from "@/lib/cloudinary/core";

/**
 * POST /api/admin/galleries/[id]/photos/bulk
 * Bulk delete photos dengan Cloudinary cleanup
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: galleryId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ code: "UNAUTHORIZED", message: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify gallery ownership
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { vendorId: true }
    });

    if (gallery?.vendorId !== session.user.id) {
      return new Response(
        JSON.stringify({ code: "FORBIDDEN", message: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    interface BulkDeleteRequest { photoIds: string[]; action: string }
    const body = await request.json() as BulkDeleteRequest;
    const { photoIds, action } = body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return new Response(
        JSON.stringify({ code: "BAD_REQUEST", message: "photoIds must be a non-empty array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action !== "delete") {
      return new Response(
        JSON.stringify({ code: "BAD_REQUEST", message: "Invalid action" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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
      return new Response(
        JSON.stringify({
          code: "NOT_FOUND",
          message: `Some photos not found or don't belong to this gallery`
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete from Cloudinary
    const cloudinaryErrors: Array<{ photoId: string; error: string }> = [];
    for (const photo of photosToDelete) {
      try {
        // Delete dari Cloudinary menggunakan public_id (storageKey)
        await deletePhotoFromCloudinary(session.user.id, photo.storageKey);
      } catch (error) {
        console.error(`Failed to delete ${photo.storageKey} from Cloudinary:`, error);
        cloudinaryErrors.push({
          photoId: photo.id,
          error: `Cloudinary delete failed: ${error instanceof Error ? error.message : "Unknown error"}`
        });
      }
    }

    // Delete dari database (regardless of Cloudinary success)
    const dbResult = await prisma.photo.deleteMany({
      where: {
        id: { in: photoIds },
        galleryId: galleryId
      }
    });

    // Return response
    interface DeleteResponse { code: string; message: string; deletedCount?: number; failedCount?: number; cloudinaryErrors?: Array<{ photoId: string; error: string }> }
    const response: DeleteResponse = {
      code: "OK",
      message: `Deleted ${dbResult.count} photo(s)`,
      deletedCount: dbResult.count,
      failedCount: cloudinaryErrors.length
    };

    if (cloudinaryErrors.length > 0) {
      response.cloudinaryErrors = cloudinaryErrors;
      response.message += ` (${cloudinaryErrors.length} Cloudinary delete failed, but DB cleaned)`;
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("POST /api/admin/galleries/[id]/photos/bulk:", error);
    return new Response(
      JSON.stringify({
        code: "ERROR",
        message: "Failed to delete photos"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
