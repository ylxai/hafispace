import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { unauthorizedResponse } from '@/lib/api/response';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const bookings = await prisma.booking.findMany({
    where: { vendorId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
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
      createdAt: true,
      paket: { select: { namaPaket: true, kategori: true } },
      payments: { select: { jumlah: true, tipe: true } },
    },
  });

  const headers = ['Kode Booking','Nama Klien','HP','Email','Tanggal Sesi','Lokasi','Status','Paket','Kategori','Harga Paket','Total Bayar','Sisa Tagihan','Status Bayar','Tanggal Buat'];
  
  const rows = bookings.map(b => {
    const totalBayar = b.payments.reduce((sum, p) => sum + Number(p.jumlah), 0);
    const harga = Number(b.hargaPaket ?? 0);
    return [
      b.kodeBooking,
      b.namaClient,
      b.hpClient,
      b.emailClient ?? '',
      b.tanggalSesi ? new Date(b.tanggalSesi).toLocaleDateString('id-ID') : '',
      b.lokasiSesi ?? '',
      b.status,
      b.paket?.namaPaket ?? '',
      b.paket?.kategori ?? '',
      harga,
      totalBayar,
      Math.max(0, harga - totalBayar),
      b.dpStatus,
      new Date(b.createdAt).toLocaleDateString('id-ID'),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bookings-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
