import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ABLY_CHANNEL_SELECTION,getAblyRest } from "@/lib/ably";
import { forbiddenResponse, notFoundResponse, validationErrorResponse } from "@/lib/api/response";
import { DEFAULT_MAX_SELECTION, MAX_GLOBAL_SELECTION_LIMIT } from "@/lib/constants";
import { RATE_LIMIT_SUBMIT_PER_MINUTE } from "@/lib/constants.server";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const submitSchema = z.object({
  photoIds: z
    .array(z.string().uuid())
    .min(1, "Pilih minimal 1 foto")
    .max(MAX_GLOBAL_SELECTION_LIMIT, `Maksimal ${MAX_GLOBAL_SELECTION_LIMIT} foto per pengiriman`),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Rate limit: maks 3 submission per menit per IP+token
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`submit:${ip}:${token}`, { limit: RATE_LIMIT_SUBMIT_PER_MINUTE, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json(
        { code: "RATE_LIMITED", message: "Terlalu banyak permintaan. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.format());
    }

    const { photoIds } = parsed.data;

    const gallery = await prisma.gallery.findUnique({
      where: { clientToken: token },
      select: {
        id: true,
        vendorId: true,
        namaProject: true,
        status: true,
        booking: { select: { maxSelection: true } },
      },
    });

    if (!gallery) {
      return notFoundResponse("Gallery not found");
    }

    if (gallery.status === "DRAFT") {
      return forbiddenResponse("Gallery is not published");
    }

    const maxSelection = gallery.booking?.maxSelection ?? DEFAULT_MAX_SELECTION;

    // Single atomic transaction: validate → replace → lock → notify
    const { createdCount, allSelections } = await prisma.$transaction(async (tx) => {
      // Check existing locked selections — if locked, reject new submission
      const existingLocked = await tx.photoSelection.count({
        where: { galleryId: gallery.id, isLocked: true },
      });
      if (existingLocked > 0) {
        throw Object.assign(new Error("ALREADY_LOCKED"), {
          code: "ALREADY_LOCKED",
          message: "Seleksi sudah dikirim sebelumnya dan tidak dapat diubah.",
          status: 409,
        });
      }

      // Validate quota
      if (photoIds.length > maxSelection) {
        throw Object.assign(new Error("QUOTA_EXCEEDED"), {
          code: "QUOTA_EXCEEDED",
          message: `Maksimal ${maxSelection} foto yang dapat dipilih, Anda memilih ${photoIds.length} foto.`,
          status: 422,
        });
      }

      // Validate all photoIds exist in this gallery — single query
      const photos = await tx.photo.findMany({
        where: { galleryId: gallery.id, id: { in: photoIds } },
        select: { id: true, filename: true, url: true },
      });

      if (photos.length !== photoIds.length) {
        const foundIds = new Set(photos.map((p) => p.id));
        const missing = photoIds.filter((id) => !foundIds.has(id));
        throw Object.assign(new Error("PHOTO_NOT_FOUND"), {
          code: "PHOTO_NOT_FOUND",
          message: `${missing.length} foto tidak ditemukan di galeri ini.`,
          status: 404,
        });
      }

      // Delete existing unlocked selections (replace with new batch)
      await tx.photoSelection.deleteMany({
        where: { galleryId: gallery.id, isLocked: false },
      });

      // Create new selections — already locked
      const now = new Date();
      await tx.photoSelection.createMany({
        data: photos.map((photo) => ({
          galleryId: gallery.id,
          fileId: photo.id,
          filename: photo.filename,
          filePath: photo.url,
          selectionType: "EDIT" as const,
          isLocked: true,
          lockedAt: now,
        })),
      });

      // Fetch all locked selections for notification
      const selections = await tx.photoSelection.findMany({
        where: { galleryId: gallery.id, isLocked: true },
        select: { filename: true },
        orderBy: { selectedAt: "asc" },
      });

      // Create notification & activity log
      await tx.notification.create({
        data: {
          vendorId: gallery.vendorId,
          type: "SELECTION_SUBMITTED",
          title: "Seleksi Foto Dikirim",
          message: `${selections.length} foto dipilih dari galeri "${gallery.namaProject}"`,
          isRead: false,
        },
      });

      await tx.activityLog.create({
        data: {
          vendorId: gallery.vendorId,
          galleryId: gallery.id,
          action: "SELECTION_SUBMITTED",
          details: `Client submitted ${selections.length} photo selection(s) for gallery "${gallery.namaProject}"`,
        },
      });

      return { createdCount: photos.length, allSelections: selections };
    });

    // Publish realtime event ke admin via Ably (di luar transaksi — non-critical)
    try {
      const ably = getAblyRest();
      await ably.channels
        .get(ABLY_CHANNEL_SELECTION(gallery.id))
        .publish("selection-submitted", {
          count: allSelections.length,
          galleryId: gallery.id,
          submittedAt: new Date().toISOString(),
        });
    } catch {
      // Non-critical — jangan gagalkan request jika Ably error
    }

    return NextResponse.json({
      success: true,
      lockedCount: createdCount,
      totalSelections: allSelections.length,
      message: `${createdCount} seleksi berhasil dikirim`,
    });
  } catch (err) {
    const error = err as { code?: string; message?: string; status?: number };

    const SAFE_ERROR_MESSAGES: Record<string, string> = {
      ALREADY_LOCKED: "Seleksi sudah dikirim sebelumnya dan tidak dapat diubah.",
      QUOTA_EXCEEDED: error.message ?? `Jumlah foto melebihi batas maksimum.`,
      PHOTO_NOT_FOUND: error.message ?? "Beberapa foto tidak ditemukan di galeri ini.",

    };
    if (error.code && error.status) {
      const safeMessage = SAFE_ERROR_MESSAGES[error.code] ?? "Terjadi kesalahan. Silakan coba lagi.";
      logger.warn({ code: error.code, message: error.message }, "[submit/route] Client error");
      return NextResponse.json(
        { code: error.code, message: safeMessage },
        { status: error.status }
      );
    }

    logger.error({ err }, "Error submitting selection");
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "Failed to submit selection" }, { status: 500 });
  }
}
