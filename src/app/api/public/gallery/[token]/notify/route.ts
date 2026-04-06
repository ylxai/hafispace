import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { notFoundResponse, validationErrorResponse } from "@/lib/api/response";
import { RATE_LIMIT_NOTIFY_PER_HOUR } from "@/lib/constants.server";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const notifySchema = z.object({
  type: z.enum(["selection_submitted"]),
  photoCount: z.number().int().min(0).max(10000),
  photos: z.array(z.string().max(500)).max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Rate limit: maks 5 notifikasi per jam per IP+token (cegah spam)
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`notify:${ip}:${token}`, { limit: RATE_LIMIT_NOTIFY_PER_HOUR, windowMs: 60 * 60_000 });
    if (!rl.success) {
      return NextResponse.json(
        { code: "RATE_LIMITED", message: "Terlalu banyak notifikasi. Coba lagi nanti." },
        { status: 429 }
      );
    }

    // Validasi input — cegah injection dan data tidak valid
    const rawBody = await request.json();
    const parsed = notifySchema.safeParse(rawBody);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.format());
    }
    const { type, photoCount, photos } = parsed.data;

    const gallery = await prisma.gallery.findUnique({
      where: { clientToken: token },
      select: { id: true, vendorId: true, namaProject: true },
    });

    if (!gallery) {
      return notFoundResponse("Gallery not found");
    }

    if (type === "selection_submitted") {
      const previewPhotos = photos?.slice(0, 3).join(", ") ?? "";
      const moreCount = (photos?.length ?? 0) > 3 ? ` +${(photos?.length ?? 0) - 3} more` : "";

      const notification = await prisma.notification.create({
        data: {
          vendorId: gallery.vendorId,
          type: "SELECTION_SUBMITTED",
          title: "New Photo Selection",
          message: `${photoCount} photos selected from gallery "${gallery.namaProject}": ${previewPhotos}${moreCount}`,
          isRead: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Notification sent",
        notificationId: notification.id,
      });
    }

    return validationErrorResponse("Invalid notification type");
  } catch (error) {
    logger.error({ err: error }, "Error sending notification");
    return handleApiError(error);
  }
}
