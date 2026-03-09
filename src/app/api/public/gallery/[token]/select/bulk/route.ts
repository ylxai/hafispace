import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAblyRest, ABLY_CHANNEL_SELECTION } from "@/lib/ably";
import { DEFAULT_MAX_SELECTION } from "@/lib/constants";
import { z } from "zod";

const BulkSelectSchema = z.object({
  action: z.enum(["add-all", "remove-all"]),
  // Untuk add-all: array foto yang akan dipilih
  photos: z
    .array(
      z.object({
        storageKey: z.string(),
        filename: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json() as unknown;
    const parsed = BulkSelectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, photos } = parsed.data;

    const gallery = await prisma.gallery.findUnique({
      where: { clientToken: token },
      select: {
        id: true,
        status: true,
        booking: { select: { maxSelection: true } },
      },
    });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    if (gallery.status === "DRAFT") {
      return NextResponse.json({ error: "Gallery is not published" }, { status: 403 });
    }

    const maxSelection = gallery.booking?.maxSelection ?? DEFAULT_MAX_SELECTION;
    let finalCount = 0;

    if (action === "remove-all") {
      // Hapus semua seleksi yang belum dikunci
      await prisma.photoSelection.deleteMany({
        where: { galleryId: gallery.id, isLocked: false },
      });
      finalCount = 0;
    } else if (action === "add-all" && photos && photos.length > 0) {
      // Cek berapa yang sudah terseleksi
      const existingCount = await prisma.photoSelection.count({
        where: { galleryId: gallery.id },
      });

      // Ambil yang belum terseleksi
      const existingStorageKeys = await prisma.photoSelection.findMany({
        where: { galleryId: gallery.id },
        select: { fileId: true },
      });
      const existingSet = new Set(existingStorageKeys.map((s) => s.fileId));

      // Hitung sisa kuota
      const remaining = maxSelection - existingCount;
      if (remaining <= 0) {
        return NextResponse.json({
          success: true,
          selectionCount: existingCount,
          message: "Kuota seleksi sudah penuh",
        });
      }

      // Filter foto yang belum terseleksi & batasi ke kuota tersisa
      const toAdd = photos
        .filter((p) => !existingSet.has(p.storageKey))
        .slice(0, remaining);

      if (toAdd.length > 0) {
        await prisma.photoSelection.createMany({
          data: toAdd.map((p) => ({
            galleryId: gallery.id,
            fileId: p.storageKey,
            filename: p.filename,
            url: p.url,
            selectionType: "EDIT",
            isLocked: false,
          })),
          skipDuplicates: true,
        });
      }

      finalCount = await prisma.photoSelection.count({
        where: { galleryId: gallery.id },
      });
    }

    // Publish realtime update via Ably
    try {
      const ably = getAblyRest();
      await ably.channels
        .get(ABLY_CHANNEL_SELECTION(gallery.id))
        .publish("count-updated", {
          count: finalCount,
          action,
        });
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      selectionCount: finalCount,
    });
  } catch (error) {
    console.error("Error bulk select:", error);
    return NextResponse.json({ error: "Failed to update selections" }, { status: 500 });
  }
}
