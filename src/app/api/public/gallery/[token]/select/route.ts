import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_MAX_SELECTION } from "@/lib/constants";
import { getAblyRest, ABLY_CHANNEL_SELECTION } from "@/lib/ably";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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

  // Rate limit: maks 120 seleksi per menit per IP+token
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`select:${ip}:${token}`, { limit: 120, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json(
      { code: "RATE_LIMITED", message: "Terlalu banyak request. Coba lagi dalam 1 menit." },
      { status: 429 }
    );
  }

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

  const maxSelection = gallery.booking?.maxSelection ?? DEFAULT_MAX_SELECTION;

  const body = await request.json();
  const parsed = selectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { fileId, filename, url, action } = parsed.data;

  // Wrap seluruh operasi dalam transaction untuk mencegah race condition
  let finalCount: number;

  try {
    finalCount = await prisma.$transaction(async (tx) => {
      if (action === "add") {
        // Hitung count di dalam transaction (atomic)
        const currentCount = await tx.photoSelection.count({
          where: { galleryId: gallery.id, isLocked: false },
        });

        if (currentCount >= maxSelection) {
          throw Object.assign(new Error("QUOTA_EXCEEDED"), {
            code: "QUOTA_EXCEEDED",
            message: `Maximum ${maxSelection} photos already selected`,
            status: 422,
          });
        }

        // Verify photo exists in gallery
        const photoExists = await tx.photo.findFirst({
          where: { galleryId: gallery.id, storageKey: fileId },
        });

        if (!photoExists) {
          throw Object.assign(new Error("PHOTO_NOT_FOUND"), {
            code: "PHOTO_NOT_FOUND",
            message: "Photo not found in gallery",
            status: 404,
          });
        }

        // Check if already selected
        const existing = await tx.photoSelection.findFirst({
          where: { galleryId: gallery.id, fileId },
        });

        if (existing) {
          throw Object.assign(new Error("ALREADY_SELECTED"), {
            code: "ALREADY_SELECTED",
            message: "Photo already selected",
            status: 409,
          });
        }

        await tx.photoSelection.create({
          data: {
            galleryId: gallery.id,
            fileId,
            filename,
            filePath: url ?? null,
            selectionType: "EDIT",
          },
        });

        // Return updated count (dalam transaction yang sama)
        return tx.photoSelection.count({
          where: { galleryId: gallery.id, isLocked: false },
        });
      } else {
        // action === "remove"
        const existing = await tx.photoSelection.findFirst({
          where: { galleryId: gallery.id, fileId, isLocked: false },
        });

        if (!existing) {
          throw Object.assign(new Error("NOT_FOUND"), {
            code: "NOT_FOUND",
            message: "Selection not found or is locked",
            status: 404,
          });
        }

        await tx.photoSelection.delete({ where: { id: existing.id } });

        // Return updated count (dalam transaction yang sama)
        return tx.photoSelection.count({
          where: { galleryId: gallery.id, isLocked: false },
        });
      }
    });
  } catch (err) {
    const error = err as { code?: string; message?: string; status?: number };
    // Hanya expose error yang sudah kita define secara eksplisit (punya code + status)
    // Pesan yang aman untuk ditampilkan ke client (tidak expose internal detail)
    // Whitelist pesan aman sesuai error.code yang di-throw di try block
    const SAFE_ERROR_MESSAGES: Record<string, string> = {
      QUOTA_EXCEEDED: "Jumlah maksimum foto yang dapat dipilih telah tercapai.",
      PHOTO_NOT_FOUND: "Foto tidak ditemukan di galeri ini.",
      ALREADY_SELECTED: "Foto ini sudah dipilih sebelumnya.",
      NOT_FOUND: "Foto atau seleksi tidak ditemukan.",
    };

    if (error.code && error.status) {
      // Gunakan pesan dari whitelist jika ada, fallback ke pesan generik
      const safeMessage = SAFE_ERROR_MESSAGES[error.code] ?? "Terjadi kesalahan. Silakan coba lagi.";
      // Log internal message ke server untuk debugging
      if (error.message && !SAFE_ERROR_MESSAGES[error.code]) {
        console.error(`[select/route] Unwhitelisted error: code=${error.code}`, error.message);
      }
      return NextResponse.json(
        { code: error.code, message: safeMessage },
        { status: error.status }
      );
    }
    throw err;
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
  } catch (ablyError) {
    // Non-critical — jangan gagalkan request jika Ably publish gagal
    // Log untuk monitoring supaya tim tahu jika Ably bermasalah
    console.warn("[Ably] Gagal publish count-updated:", {
      galleryId: gallery.id,
      fileId,
      action,
      error: ablyError instanceof Error ? ablyError.message : String(ablyError),
    });
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
