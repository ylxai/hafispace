import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api/response";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  selectionIds: z.array(z.string().uuid()),
  isLocked: z.boolean().optional(),
  selectionType: z.enum(["EDIT", "PRINT"]).optional(),
});

const bulkDeleteSchema = z.object({
  selectionIds: z.array(z.string().uuid()),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id: galleryId } = await params;

  try {
    const body = await request.json();
    const { action, ...data } = body;

    // Verify gallery belongs to vendor
    const gallery = await prisma.gallery.findFirst({
      where: {
        id: galleryId,
        vendorId: session.user.id,
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Gallery not found" },
        { status: 404 }
      );
    }

    if (action === "update") {
      const { selectionIds, isLocked, selectionType } = bulkUpdateSchema.parse(data);
      
      if (isLocked === undefined && selectionType === undefined) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "At least one field (isLocked or selectionType) is required" },
          { status: 400 }
        );
      }

      // Update selections
      const updateData: {
        isLocked?: boolean;
        selectionType?: "EDIT" | "PRINT";
        lockedAt?: Date;
      } = {};
      if (isLocked !== undefined) updateData.isLocked = isLocked;
      if (selectionType) updateData.selectionType = selectionType;
      if (isLocked) updateData.lockedAt = new Date();

      const updatedCount = await prisma.photoSelection.updateMany({
        where: {
          id: { in: selectionIds },
          galleryId: galleryId,
        },
        data: updateData,
      });

      // Add activity log
      if (isLocked !== undefined) {
        await prisma.activityLog.create({
          data: {
            vendorId: session.user.id,
            galleryId,
            action: isLocked ? "SELECTIONS_LOCKED_BULK" : "SELECTIONS_UNLOCKED_BULK",
            details: `${updatedCount.count} selection(s) ${isLocked ? 'locked' : 'unlocked'} in bulk`,
          },
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: `${updatedCount.count} selection(s) updated successfully`,
        updatedCount: updatedCount.count,
      });
    } 
    else if (action === "delete") {
      const { selectionIds } = bulkDeleteSchema.parse(data);

      // Delete selections
      const deletedCount = await prisma.photoSelection.deleteMany({
        where: {
          id: { in: selectionIds },
          galleryId: galleryId,
        },
      });

      // Add activity log
      await prisma.activityLog.create({
        data: {
          vendorId: session.user.id,
          galleryId,
          action: "SELECTIONS_DELETED_BULK",
          details: `${deletedCount.count} selection(s) deleted in bulk`,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: `${deletedCount.count} selection(s) deleted successfully`,
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
    
    console.error("Bulk selection operation error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}