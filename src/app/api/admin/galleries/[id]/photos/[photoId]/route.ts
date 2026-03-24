import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { deletePhotoFromCloudinary } from "@/lib/cloudinary/core";

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
      console.error(`Failed to delete ${photo.storageKey} from Cloudinary:`, error);
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
    console.error("DELETE /api/admin/galleries/[id]/photos/[photoId]:", error);
    return NextResponse.json(
      {
        code: "ERROR",
        message: "Failed to delete photo"
      },
      { status: 500 }
    );
  }
}
