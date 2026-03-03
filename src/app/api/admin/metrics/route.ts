import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api/response";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const vendorId = session.user.id;

  const [
    clientCount,
    bookingCount,
    activeBookingCount,
    galleryCount,
    deliveredGalleryCount,
    pendingNotificationCount,
  ] = await Promise.all([
    prisma.client.count({ where: { vendorId } }),
    prisma.booking.count({ where: { vendorId } }),
    prisma.booking.count({ 
      where: { 
        vendorId,
        status: { in: ["PENDING", "CONFIRMED"] }
      } 
    }),
    prisma.gallery.count({ where: { vendorId } }),
    prisma.gallery.count({ 
      where: { 
        vendorId,
        status: "DELIVERED"
      } 
    }),
    prisma.notification.count({ 
      where: { 
        vendorId,
        isRead: false
      } 
    }),
  ]);

  return NextResponse.json({
    clientCount,
    bookingCount,
    activeBookingCount,
    galleryCount,
    deliveredGalleryCount,
    pendingNotificationCount,
  });
}
