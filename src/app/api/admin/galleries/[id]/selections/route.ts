import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api/response";
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
    const gallery = await prisma.gallery.findUnique({
      where: {
        id: galleryId,
        vendorId: session.user.id,
      },
      include: {
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
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Gallery not found" },
        { status: 404 }
      );
    }

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
    const body = await request.json();
    const { selectionId, isLocked } = toggleLockSchema.parse(body);

    const selection = await prisma.photoSelection.findUnique({
      where: { id: selectionId },
      include: {
        gallery: {
          select: { vendorId: true },
        },
      },
    });

    if (!selection || selection.gallery.vendorId !== session.user.id) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Selection not found" },
        { status: 404 }
      );
    }

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
        galleryId: selection.galleryId,
        action: isLocked ? "SELECTION_LOCKED" : "SELECTION_UNLOCKED",
        details: `Selection ${selection.filename} ${isLocked ? "locked" : "unlocked"}`,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
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
    const body = await request.json();
    const { selectionId } = deleteSchema.parse(body);

    const selection = await prisma.photoSelection.findUnique({
      where: { id: selectionId },
      include: {
        gallery: {
          select: { vendorId: true },
        },
      },
    });

    if (!selection || selection.gallery.vendorId !== session.user.id) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Selection not found" },
        { status: 404 }
      );
    }

    await prisma.photoSelection.delete({
      where: { id: selectionId },
    });

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error deleting selection:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to delete selection" },
      { status: 500 }
    );
  }
}
