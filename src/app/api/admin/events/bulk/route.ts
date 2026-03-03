import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api/response";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  bookingIds: z.array(z.string().uuid()),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
});

const bulkDeleteSchema = z.object({
  bookingIds: z.array(z.string().uuid()),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === "update") {
      const { bookingIds, status } = bulkUpdateSchema.parse(data);
      
      if (!status) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "Status is required for update action" },
          { status: 400 }
        );
      }

      // Update bookings
      const updatedCount = await prisma.booking.updateMany({
        where: {
          id: { in: bookingIds },
          vendorId: session.user.id,
        },
        data: { status },
      });

      return NextResponse.json({ 
        success: true, 
        message: `${updatedCount.count} booking(s) updated successfully`,
        updatedCount: updatedCount.count,
      });
    } 
    else if (action === "delete") {
      const { bookingIds } = bulkDeleteSchema.parse(data);
      // First check if bookings have associated galleries
      const bookingsWithGalleries = await prisma.booking.findMany({
        where: {
          id: { in: bookingIds },
          vendorId: session.user.id,
        },
        include: {
          _count: {
            select: { galleries: true },
          },
        },
      });

      // Check if any booking has galleries
      const bookingsWithGalleriesCount = bookingsWithGalleries.filter(b => b._count.galleries > 0).length;
      if (bookingsWithGalleriesCount > 0) {
        return NextResponse.json(
          { 
            code: "HAS_GALLERIES", 
            message: `Cannot delete ${bookingsWithGalleriesCount} booking(s) with galleries. Delete galleries first.`,
            bookingsWithGalleries: bookingsWithGalleries
              .filter(b => b._count.galleries > 0)
              .map(b => ({
                id: b.id,
                namaClient: b.namaClient,
                galleryCount: b._count.galleries,
              })),
          },
          { status: 400 }
        );
      }

      // Delete bookings
      const deletedCount = await prisma.booking.deleteMany({
        where: {
          id: { in: bookingIds },
          vendorId: session.user.id,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: `${deletedCount.count} booking(s) deleted successfully`,
        deletedCount: deletedCount.count,
      });
    } 
    else {
      return NextResponse.json(
        { code: "INVALID_ACTION", message: "Invalid action. Use 'update' or 'delete'." },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    
    console.error("Bulk booking operation error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}