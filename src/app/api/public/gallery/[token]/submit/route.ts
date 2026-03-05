import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAblyRest, ABLY_CHANNEL_SELECTION } from "@/lib/ably";

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

    // Lock semua seleksi yang belum di-lock (dalam satu transaksi)
    const [result, allSelections] = await prisma.$transaction([
      prisma.photoSelection.updateMany({
        where: { galleryId: gallery.id, isLocked: false },
        data: { isLocked: true, lockedAt: new Date() },
      }),
      prisma.photoSelection.findMany({
        where: { galleryId: gallery.id, isLocked: true },
        select: { filename: true },
        orderBy: { selectedAt: "asc" },
      }),
    ]);

    // Hanya buat notifikasi & log jika ada seleksi baru yang dikunci
    // Mencegah spam notifikasi jika endpoint dipanggil berulang kali
    if (result.count > 0) {
      await prisma.$transaction([
        prisma.notification.create({
          data: {
            vendorId: gallery.vendorId,
            type: "SELECTION_SUBMITTED",
            title: "Seleksi Foto Dikirim",
            message: `${allSelections.length} foto dipilih dari galeri "${gallery.namaProject}"`,
            isRead: false,
          },
        }),
        prisma.activityLog.create({
          data: {
            vendorId: gallery.vendorId,
            galleryId: gallery.id,
            action: "SELECTION_SUBMITTED",
            details: `Client submitted ${allSelections.length} photo selection(s) for gallery "${gallery.namaProject}"`,
          },
        }),
      ]);

      // Publish realtime event ke admin via Ably
      try {
        const ably = getAblyRest();
        await ably.channels
          .get(ABLY_CHANNEL_SELECTION(gallery.id))
          .publish("selection-submitted", {
            count: allSelections.length,
            galleryId: gallery.id,
            submittedAt: new Date().toISOString(),
          });
      } catch {
        // Non-critical — jangan gagalkan request jika Ably error
      }
    }

    return NextResponse.json({
      success: true,
      lockedCount: result.count,
      totalSelections: allSelections.length,
      message: result.count > 0
        ? `${result.count} seleksi berhasil dikunci`
        : "Semua seleksi sudah dikunci sebelumnya",
    });
  } catch (error) {
    console.error("Error submitting selection:", error);
    return NextResponse.json({ error: "Failed to submit selection" }, { status: 500 });
  }
}
