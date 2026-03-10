import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const notifySchema = z.object({
  type: z.enum(["selection_submitted"]),
  photoCount: z.number().int().min(0).max(10000),
  photos: z.array(z.string().max(500)).max(1000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Rate limit: maks 5 notifikasi per jam per IP+token (cegah spam)
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`notify:${ip}:${token}`, { limit: 5, windowMs: 60 * 60_000 });
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
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { type, photoCount, photos } = parsed.data;

    const gallery = await prisma.gallery.findUnique({
      where: { clientToken: token },
      select: { id: true, vendorId: true, namaProject: true },
    });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
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

    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
