import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { deletePhotoFromCloudinary } from "@/lib/cloudinary";
import { unauthorizedResponse } from "@/lib/api/response";
import { z } from "zod";

const deleteSchema = z.object({
  photoId: z.string().uuid(),
});

const bulkDeleteSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1),
});

// DELETE single photo — hapus dari database + Cloudinary
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { id: galleryId } = await params;

  try {
    const body = await request.json();
    const { photoId } = deleteSchema.parse(body);

    // Verify photo belongs to vendor's gallery
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        galleryId,
        gallery: { vendorId: session.user.id },
      },
      select: {
        id: true,
        storageKey: true,
        filename: true,
      },
    });

    if (!photo) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Photo not found" },
        { status: 404 }
      );
    }

    // Hapus dari Cloudinary dulu (non-blocking jika gagal)
    try {
      await deletePhotoFromCloudinary(session.user.id, photo.storageKey);
    } catch (cloudinaryError) {
      console.error("Failed to delete photo from Cloudinary:", cloudinaryError);
      // Lanjutkan hapus dari database meski Cloudinary gagal
    }

    // Hapus dari database (selections akan cascade delete)
    await prisma.photo.delete({ where: { id: photoId } });

    await prisma.activityLog.create({
      data: {
        vendorId: session.user.id,
        galleryId,
        action: "PHOTO_DELETED",
        details: `Photo ${photo.filename} deleted`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to delete photo" },
      { status: 500 }
    );
  }
}

// PATCH bulk delete photos
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { id: galleryId } = await params;

  try {
    const body = await request.json();
    const { photoIds } = bulkDeleteSchema.parse(body);

    // Verify all photos belong to vendor's gallery
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        galleryId,
        gallery: { vendorId: session.user.id },
      },
      select: { id: true, storageKey: true, filename: true },
    });

    if (photos.length === 0) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "No photos found" },
        { status: 404 }
      );
    }

    // Hapus dari Cloudinary (parallel, non-blocking per foto)
    await Promise.allSettled(
      photos.map((photo) =>
        deletePhotoFromCloudinary(session.user.id, photo.storageKey).catch(
          (err) => console.error(`Failed to delete ${photo.storageKey} from Cloudinary:`, err)
        )
      )
    );

    // Hapus dari database
    const foundIds = photos.map((p) => p.id);
    await prisma.photo.deleteMany({ where: { id: { in: foundIds } } });

    await prisma.activityLog.create({
      data: {
        vendorId: session.user.id,
        galleryId,
        action: "PHOTO_BULK_DELETED",
        details: `${foundIds.length} photos deleted`,
      },
    });

    return NextResponse.json({ success: true, deleted: foundIds.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error bulk deleting photos:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to delete photos" },
      { status: 500 }
    );
  }
}
