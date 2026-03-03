import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAblyRest, ABLY_CHANNEL_SELECTION } from "@/lib/ably";
import {
  getSelectionCount,
  incrementSelection,
  decrementSelection,
} from "@/lib/redis";
import { z } from "zod";

const selectSchema = z.object({
  fileId: z.string().min(1, "fileId is required"),
  filename: z.string().min(1),
  url: z.string().url().optional().or(z.literal("")),
  action: z.enum(["add", "remove"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const gallery = await prisma.gallery.findUnique({
    where: { clientToken: token },
    include: {
      booking: {
        select: {
          maxSelection: true,
        },
      },
    },
  });

  if (!gallery) {
    return NextResponse.json(
      { error: "Gallery not found" },
      { status: 404 }
    );
  }

  if (gallery.status === "DRAFT") {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Gallery is not published" },
      { status: 403 }
    );
  }

  const maxSelection = gallery.booking?.maxSelection ?? 40;

  const body = await request.json();
  const parsed = selectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { fileId, filename, url, action } = parsed.data;

  // Get current count from database
  const currentCount = await getSelectionCount(gallery.id);

  let finalCount = currentCount;

  if (action === "add") {
    if (currentCount >= maxSelection) {
      return NextResponse.json(
        { code: "QUOTA_EXCEEDED", message: `Maximum ${maxSelection} photos already selected` },
        { status: 422 }
      );
    }

    // Verify photo exists in gallery
    const photoExists = await prisma.photo.findFirst({
      where: {
        galleryId: gallery.id,
        storageKey: fileId,
      },
    });

    if (!photoExists) {
      return NextResponse.json(
        { code: "PHOTO_NOT_FOUND", message: "Photo not found in gallery" },
        { status: 404 }
      );
    }

    // Check if already selected
    const existing = await prisma.photoSelection.findFirst({
      where: { galleryId: gallery.id, fileId },
    });

    if (existing) {
      return NextResponse.json(
        { code: "ALREADY_SELECTED", message: "Photo already selected" },
        { status: 409 }
      );
    }

    await prisma.photoSelection.create({
      data: {
        galleryId: gallery.id,
        fileId,
        filename,
        filePath: url ?? null,
        selectionType: "EDIT",
      },
    });

    // Get updated count from database
    finalCount = await incrementSelection(gallery.id);
  } else {
    // action === "remove"
    const existing = await prisma.photoSelection.findFirst({
      where: { galleryId: gallery.id, fileId, isLocked: false },
    });

    if (!existing) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Selection not found or is locked" },
        { status: 404 }
      );
    }

    await prisma.photoSelection.delete({ where: { id: existing.id } });
    // Get updated count from database
    finalCount = await decrementSelection(gallery.id);
  }

  // Publish real-time update via Ably
  try {
    const ably = getAblyRest();
    await ably.channels
      .get(ABLY_CHANNEL_SELECTION(gallery.id))
      .publish("count-updated", {
        count: finalCount,
        fileId,
        action,
      });
  } catch {
    // Non-critical — don't fail the request if Ably publish fails
  }

  return NextResponse.json({
    success: true,
    action,
    fileId,
    selectionCount: finalCount,
    maxSelection,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const gallery = await prisma.gallery.findUnique({
    where: { clientToken: token },
    select: { id: true, status: true },
  });

  if (!gallery) {
    return NextResponse.json({ selections: [] });
  }

  const selections = await prisma.photoSelection.findMany({
    where: { galleryId: gallery.id },
    select: {
      id: true,
      fileId: true,
      filename: true,
      selectionType: true,
      isLocked: true,
      selectedAt: true,
    },
    orderBy: { selectedAt: "asc" },
  });

  return NextResponse.json({ selections });
}
