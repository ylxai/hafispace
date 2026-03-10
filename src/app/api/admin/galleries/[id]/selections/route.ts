import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse, notFoundResponse, parseAndValidate } from "@/lib/api/response";
import { deletePhotoFromCloudinary } from "@/lib/cloudinary";
import { verifyGalleryOwnershipWithSelect } from "@/lib/api/gallery-auth";
import { verifySelectionOwnership } from "@/lib/api/resource-auth";
import { z } from "zod";

const toggleLockSchema = z.object({
  selectionId: z.string().uuid(),
  isLocked: z.boolean(),
});

const deleteSchema = z.object({
  selectionId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id: galleryId } = await params;

  try {
    const ownership = await verifyGalleryOwnershipWithSelect(galleryId, session.user.id, {
      selections: {
        orderBy: { selectedAt: "desc" },
      },
      photos: {
        select: {
          storageKey: true,
          url: true,
          thumbnailUrl: true,
        },
      },
    });

    if (!ownership.found) {
      return notFoundResponse("Gallery not found");
    }

    const gallery = ownership.gallery;

    const photoMap = new Map(
      gallery.photos.map((photo) => [photo.storageKey, photo])
    );

    const selections = gallery.selections.map((selection) => {
      const photo = photoMap.get(selection.fileId);
      return {
        id: selection.id,
        fileId: selection.fileId,
        filename: selection.filename,
        selectionType: selection.selectionType,
        printSize: selection.printSize,
        selectedAt: selection.selectedAt.toISOString(),
        isLocked: selection.isLocked,
        lockedAt: selection.lockedAt?.toISOString() ?? null,
        thumbnailUrl: photo?.thumbnailUrl ?? photo?.url ?? null,
        url: photo?.url ?? null,
      };
    });

    return NextResponse.json({
      selections,
      stats: {
        total: selections.length,
        edit: selections.filter((s) => s.selectionType === "EDIT").length,
        print: selections.filter((s) => s.selectionType === "PRINT").length,
        locked: selections.filter((s) => s.isLocked).length,
      },
    });
  } catch (error) {
    console.error("Error fetching selections:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to fetch selections" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const result = await parseAndValidate(request, toggleLockSchema);
    if (!result.ok) return result.response;

    const { selectionId, isLocked } = result.data;

    const ownership = await verifySelectionOwnership(selectionId, session.user.id);
    if (!ownership.found) {
      return notFoundResponse("Selection not found");
    }

    // Gunakan ownership.resource — hindari redundant findUnique query
    const { filename, galleryId } = ownership.resource;

    const updated = await prisma.photoSelection.update({
      where: { id: selectionId },
      data: {
        isLocked,
        lockedAt: isLocked ? new Date() : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        vendorId: session.user.id,
        galleryId,
        action: isLocked ? "SELECTION_LOCKED" : "SELECTION_UNLOCKED",
        details: `Selection ${filename} ${isLocked ? "locked" : "unlocked"}`,
      },
    });

    return NextResponse.json({
      success: true,
      selection: {
        id: updated.id,
        isLocked: updated.isLocked,
        lockedAt: updated.lockedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Error updating selection:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to update selection" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const result = await parseAndValidate(request, deleteSchema);
    if (!result.ok) return result.response;

    const { selectionId } = result.data;

    const ownership = await verifySelectionOwnership(selectionId, session.user.id);
    if (!ownership.found) {
      return notFoundResponse("Selection not found");
    }

    const selection = ownership.resource;

    await prisma.photoSelection.delete({
      where: { id: selectionId },
    });

    try {
      await deletePhotoFromCloudinary(session.user.id, selection.fileId);
    } catch (cloudinaryError) {
      console.error("Gagal menghapus foto dari Cloudinary:", cloudinaryError);
    }

    await prisma.activityLog.create({
      data: {
        vendorId: session.user.id,
        galleryId: selection.galleryId,
        action: "SELECTION_DELETED",
        details: `Selection ${selection.filename} deleted`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting selection:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to delete selection" },
      { status: 500 }
    );
  }
}
