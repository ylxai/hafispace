import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { deletePhotoFromCloudinary } from "@/lib/cloudinary/core";

// Initialize Cloudinary

/**
 * DELETE /api/admin/galleries/[id]/photos/[photoId]
 * Hapus satu foto dari gallery + Cloudinary
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id: galleryId, photoId } = await params;
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

    // Get photo details sebelum delete
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { storageKey: true, galleryId: true }
    });

    if (!photo?.galleryId || photo.galleryId !== galleryId) {
      return new Response(
        JSON.stringify({ code: "NOT_FOUND", message: "Photo not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete dari Cloudinary
    let cloudinaryError: string | null = null;
    try {
      await deletePhotoFromCloudinary(session.user.id, photo.storageKey);
    } catch (error) {
      console.error(`Failed to delete ${photo.storageKey} from Cloudinary:`, error);
      cloudinaryError = error instanceof Error ? error.message : "Unknown error";
    }

    // Delete dari database (regardless of Cloudinary success)
    await prisma.photo.delete({
      where: { id: photoId }
    });

    interface SingleDeleteResponse { code: string; message: string; deletedPhotoId?: string; cloudinaryError?: string }
    const response: SingleDeleteResponse = {
      code: "OK",
      message: "Photo deleted successfully",
      deletedPhotoId: photoId
    };

    if (cloudinaryError) {
      response.cloudinaryError = cloudinaryError;
      response.message += " (database cleaned, but Cloudinary delete failed)";
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("DELETE /api/admin/galleries/[id]/photos/[photoId]:", error);
    return new Response(
      JSON.stringify({
        code: "ERROR",
        message: "Failed to delete photo"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
