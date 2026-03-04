import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ kodeBooking: string }> }
) {
  const { kodeBooking } = await params;

  const booking = await prisma.booking.findUnique({
    where: { kodeBooking },
    select: {
      id: true,
      kodeBooking: true,
      namaClient: true,
      hpClient: true,
      emailClient: true,
      tanggalSesi: true,
      lokasiSesi: true,
      status: true,
      hargaPaket: true,
      dpAmount: true,
      dpStatus: true,
      notes: true,
      createdAt: true,
      paket: {
        select: {
          namaPaket: true,
          kategori: true,
          kuotaEdit: true,
          includeCetak: true,
          deskripsi: true,
        },
      },
      payments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          jumlah: true,
          tipe: true,
          keterangan: true,
          createdAt: true,
        },
      },
      vendor: {
        select: {
          namaStudio: true,
          logoUrl: true,
          phone: true,
          email: true,
          rekeningPembayaran: true,
          themeColor: true,
          dpPercentage: true,
        },
      },
    },
  });

  if (!booking) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });

  const totalBayar = booking.payments.reduce((sum, p) => sum + Number(p.jumlah), 0);
  const hargaPaket = Number(booking.hargaPaket ?? 0);
  const sisaTagihan = Math.max(0, hargaPaket - totalBayar);
  const dpAmount = Math.ceil((hargaPaket * (booking.vendor.dpPercentage ?? 30)) / 100);

  return NextResponse.json({
    booking: {
      ...booking,
      hargaPaket,
      dpAmount: Number(booking.dpAmount ?? dpAmount),
      tanggalSesi: booking.tanggalSesi?.toISOString(),
      createdAt: booking.createdAt.toISOString(),
      payments: booking.payments.map((p) => ({
        ...p,
        jumlah: Number(p.jumlah),
        createdAt: new Date(p.createdAt).toISOString(),
      })),
    },
    summary: {
      totalBayar,
      sisaTagihan,
      lunas: sisaTagihan === 0 && hargaPaket > 0,
    },
  });
}
