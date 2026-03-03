import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api/response";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  galleryIds: z.array(z.string().uuid()),
});

const bulkUpdateSchema = z.object({
  galleryIds: z.array(z.string().uuid()),
  status: z.enum(["DRAFT", "IN_REVIEW", "DELIVERED"]).optional(),
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
      const { galleryIds } = bulkDeleteSchema.parse(data);
      
      // Verify all galleries belong to vendor and have no photos
      const galleries = await prisma.gallery.findMany({
        where: {
          id: { in: galleryIds },
          vendorId: session.user.id,
        },
        include: {
          _count: {
            select: { photos: true },
          },
        },
      });

      // Check if any gallery has photos
      const galleriesWithPhotos = galleries.filter(g => g._count.photos > 0);
      if (galleriesWithPhotos.length > 0) {
        return NextResponse.json(
          { 
            code: "HAS_PHOTOS", 
            message: `Cannot delete ${galleriesWithPhotos.length} gallery(ies) with photos. Delete photos first.`,
            galleriesWithPhotos: galleriesWithPhotos.map(g => ({
              id: g.id,
              namaProject: g.namaProject,
              photoCount: g._count.photos,
            })),
          },
          { status: 400 }
        );
      }

      // Delete galleries
      const deletedCount = await prisma.gallery.deleteMany({
        where: {
          id: { in: galleryIds },
          vendorId: session.user.id,
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: `${deletedCount.count} gallery(ies) deleted successfully`,
        deletedCount: deletedCount.count,
      });
    } 
    else if (action === "update") {
      const { galleryIds, status } = bulkUpdateSchema.parse(data);
      
      if (!status) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "Status is required for update action" },
          { status: 400 }
        );
      }

      // Update galleries
      const updatedCount = await prisma.gallery.updateMany({
        where: {
          id: { in: galleryIds },
          vendorId: session.user.id,
        },
        data: { status },
      });

      return NextResponse.json({ 
        success: true, 
        message: `${updatedCount.count} gallery(ies) updated successfully`,
        updatedCount: updatedCount.count,
      });
    } 
    else {
      return NextResponse.json(
        { code: "INVALID_ACTION", message: "Invalid action. Use 'delete' or 'update'." },
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
    
    console.error("Bulk gallery operation error:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}