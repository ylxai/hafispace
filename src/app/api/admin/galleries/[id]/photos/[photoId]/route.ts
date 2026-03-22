import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db";

/**
 * DELETE /api/admin/galleries/[id]/photos/[photoId]
 * Hapus satu foto dari gallery
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

    if (!gallery || gallery.vendorId !== session.user.id) {
      return new Response(
        JSON.stringify({ code: "FORBIDDEN", message: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get photo details sebelum delete (untuk Cloudinary cleanup)
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

    // Delete photo dari database
    await prisma.photo.delete({
      where: { id: photoId }
    });

    // TODO: Delete dari Cloudinary menggunakan storageKey
    // const cloudinary = new Cloudinary(...);
    // await cloudinary.deleteImage(photo.storageKey);

    return new Response(
      JSON.stringify({
        code: "OK",
        message: "Photo deleted successfully",
        deletedPhotoId: photoId
      }),
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
