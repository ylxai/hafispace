import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
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
