import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Rate limit: maks 5 notifikasi per jam per IP+token (cegah spam)
    const ip = getClientIp(request);
    const rl = checkRateLimit(`notify:${ip}:${token}`, { limit: 5, windowMs: 60 * 60_000 });
    if (!rl.success) {
      return NextResponse.json(
        { code: "RATE_LIMITED", message: "Terlalu banyak notifikasi. Coba lagi nanti." },
        { status: 429 }
      );
    }
    const body = await request.json();
    const { type, photoCount, photos } = body;

    const gallery = await prisma.gallery.findUnique({
      where: { clientToken: token },
      select: { id: true, vendorId: true, namaProject: true },
    });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    if (type === "selection_submitted") {
      const notification = await prisma.notification.create({
        data: {
          vendorId: gallery.vendorId,
          type: "SELECTION_SUBMITTED",
          title: "New Photo Selection",
          message: `${photoCount} photos selected from gallery "${gallery.namaProject}": ${photos?.slice(0, 3).join(", ")}${photos?.length > 3 ? ` +${photos.length - 3} more` : ""}`,
          isRead: false,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: "Notification sent",
        notificationId: notification.id 
      });
    }

    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
