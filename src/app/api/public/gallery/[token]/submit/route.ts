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

    // Gabungkan lock + notifikasi + log dalam SATU transaksi
    // Mencegah partial success (seleksi terkunci tapi notifikasi gagal dibuat)
    const { lockedCount, allSelections } = await prisma.$transaction(async (tx) => {
      // Lock semua seleksi yang belum di-lock
      const lockResult = await tx.photoSelection.updateMany({
        where: { galleryId: gallery.id, isLocked: false },
        data: { isLocked: true, lockedAt: new Date() },
      });

      // Ambil semua seleksi yang sudah terkunci (termasuk yang baru dikunci)
      const selections = await tx.photoSelection.findMany({
        where: { galleryId: gallery.id, isLocked: true },
        select: { filename: true },
        orderBy: { selectedAt: "asc" },
      });

      // Hanya buat notifikasi & log jika ada seleksi baru yang dikunci
      // Mencegah spam notifikasi jika endpoint dipanggil berulang kali
      if (lockResult.count > 0) {
        await tx.notification.create({
          data: {
            vendorId: gallery.vendorId,
            type: "SELECTION_SUBMITTED",
            title: "Seleksi Foto Dikirim",
            message: `${selections.length} foto dipilih dari galeri "${gallery.namaProject}"`,
            isRead: false,
          },
        });

        await tx.activityLog.create({
          data: {
            vendorId: gallery.vendorId,
            galleryId: gallery.id,
            action: "SELECTION_SUBMITTED",
            details: `Client submitted ${selections.length} photo selection(s) for gallery "${gallery.namaProject}"`,
          },
        });
      }

      return { lockedCount: lockResult.count, allSelections: selections };
    });

    // Publish realtime event ke admin via Ably (di luar transaksi — non-critical)
    if (lockedCount > 0) {
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
      lockedCount,
      totalSelections: allSelections.length,
      message: lockedCount > 0
        ? `${lockedCount} seleksi berhasil dikunci`
        : "Semua seleksi sudah dikunci sebelumnya",
    });
  } catch (error) {
    console.error("Error submitting selection:", error);
    return NextResponse.json({ error: "Failed to submit selection" }, { status: 500 });
  }
}
