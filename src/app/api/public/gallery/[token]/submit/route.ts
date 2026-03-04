import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const gallery = await prisma.gallery.findUnique({
      where: { clientToken: token },
      select: { id: true, vendorId: true, namaProject: true, status: true },
    });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    if (gallery.status === "DRAFT") {
      return NextResponse.json({ error: "Gallery is not published" }, { status: 403 });
    }

    // Lock semua seleksi yang belum di-lock
    const result = await prisma.photoSelection.updateMany({
      where: {
        galleryId: gallery.id,
        isLocked: false,
      },
      data: {
        isLocked: true,
        lockedAt: new Date(),
      },
    });

    // Ambil semua seleksi yang terkunci untuk notifikasi
    const allSelections = await prisma.photoSelection.findMany({
      where: { galleryId: gallery.id, isLocked: true },
      select: { filename: true },
      orderBy: { selectedAt: "asc" },
    });

    // Simpan notifikasi ke admin
    if (allSelections.length > 0) {
      await prisma.notification.create({
        data: {
          vendorId: gallery.vendorId,
          type: "SELECTION_SUBMITTED",
          title: "Seleksi Foto Dikirim",
          message: `${allSelections.length} foto dipilih dari galeri "${gallery.namaProject}"`,
          isRead: false,
        },
      });

      // Activity log
      await prisma.activityLog.create({
        data: {
          vendorId: gallery.vendorId,
          galleryId: gallery.id,
          action: "SELECTION_SUBMITTED",
          details: `Client submitted ${allSelections.length} photo selection(s) for gallery "${gallery.namaProject}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      lockedCount: result.count,
      totalSelections: allSelections.length,
      message: `${result.count} seleksi berhasil dikunci`,
    });
  } catch (error) {
    console.error("Error submitting selection:", error);
    return NextResponse.json({ error: "Failed to submit selection" }, { status: 500 });
  }
}
