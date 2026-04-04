import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { verifyGalleryOwnershipWithSelect } from "@/lib/api/gallery-auth";
import { verifySelectionOwnership } from "@/lib/api/resource-auth";
import { notFoundResponse, parseAndValidate } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

const toggleLockSchema = z.object({
  selectionId: z.string().uuid(),
  isLocked: z.boolean(),
});

const deleteSchema = z.object({
  selectionId: z.string().uuid(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: galleryId } = await params;

  try {
    const user = await requireAuth(_request);

    const ownership = await verifyGalleryOwnershipWithSelect(galleryId, user.id, {
      selections: {
        orderBy: { selectedAt: "desc" },
      },
      photos: {
        select: {
          id: true,       // Dipakai sebagai key di photoMap (match dengan selection.fileId)
          url: true,
          thumbnailUrl: true,
        },
      },
    });

    if (!ownership.found) {
      return notFoundResponse("Gallery not found");
    }

    const gallery = ownership.gallery;

    // Gunakan photo.id sebagai key — match dengan selection.fileId (UUID)
    // Sebelumnya: storageKey → mismatch karena fileId sekarang pakai photo.id
    const photoMap = new Map(
      gallery.photos.map((photo) => [photo.id, photo])
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
      return handleApiError(error);
    }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const result = await parseAndValidate(request, toggleLockSchema);
    if (!result.ok) return result.response;

    const { selectionId, isLocked } = result.data;

    const ownership = await verifySelectionOwnership(selectionId, user.id);
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
        vendorId: user.id,
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
      return handleApiError(error);
    }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const result = await parseAndValidate(request, deleteSchema);
    if (!result.ok) return result.response;
    const { selectionId } = result.data;

    const ownership = await verifySelectionOwnership(selectionId, user.id);
    if (!ownership.found) {
      return notFoundResponse("Selection not found");
    }

    const selection = ownership.resource;

    await prisma.photoSelection.delete({
      where: { id: selectionId },
    });

    await prisma.activityLog.create({
      data: {
        vendorId: user.id,
        galleryId: selection.galleryId,
        action: "SELECTION_DELETED",
        details: `Selection ${selection.filename} deleted`,
      },
    });

    return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
}
