import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api/response";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  clientIds: z.array(z.string().uuid()),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === "delete") {
      const { clientIds } = bulkDeleteSchema.parse(data);
      
      // First check if clients have associated bookings
      const clientsWithBookings = await prisma.client.findMany({
        where: {
          id: { in: clientIds },
          vendorId: session.user.id,
        },
        include: {
          _count: {
            select: { bookings: true },
          },
        },
      });

      // Check if any client has bookings
      const clientsWithBookingsCount = clientsWithBookings.filter(c => c._count.bookings > 0).length;
      if (clientsWithBookingsCount > 0) {
        return NextResponse.json(
          { 
            code: "HAS_BOOKINGS", 
            message: `Cannot delete ${clientsWithBookingsCount} client(s) with bookings. Delete bookings first.`,
            clientsWithBookings: clientsWithBookings
              .filter(c => c._count.bookings > 0)
              .map(c => ({
                id: c.id,
                name: c.name,
                bookingCount: c._count.bookings,
              })),
          },
          { status: 400 }
        );
      }

      // Delete clients
      const deletedCount = await prisma.client.deleteMany({
        where: {
          id: { in: clientIds },
          vendorId: session.user.id,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: `${deletedCount.count} client(s) deleted successfully`,
        deletedCount: deletedCount.count,
      });
    } 
    else {
      return NextResponse.json(
        { code: "INVALID_ACTION", message: "Invalid action. Use 'delete'." },
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
    
    console.error("Bulk client operation error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}