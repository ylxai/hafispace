import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

const bulkUpdateSchema = z.object({
  selectionIds: z.array(z.string().uuid()),
  isLocked: z.boolean().optional(),
  selectionType: z.enum(["EDIT", "PRINT"]).optional(),
});

const bulkDeleteSchema = z.object({
  selectionIds: z.array(z.string().uuid()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: galleryId } = await params;

  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { action, ...data } = body;

    // Verify gallery belongs to vendor
    const gallery = await prisma.gallery.findFirst({
      where: {
        id: galleryId,
        vendorId: user.id,
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
            vendorId: user.id,
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
          vendorId: user.id,
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
    
    return handleApiError(error);
  }
}