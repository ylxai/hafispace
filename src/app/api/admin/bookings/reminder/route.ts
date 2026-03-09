import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { unauthorizedResponse, notFoundResponse, validationErrorResponse, parseRequestBody } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const bodyResult = await parseRequestBody(request);
  if (!bodyResult.ok) return bodyResult.response;
  const { bookingId } = bodyResult.data as { bookingId?: string };
  if (!bookingId) return validationErrorResponse('bookingId required');

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vendorId: session.user.id },
    select: {
      namaClient: true,
      hpClient: true,
      tanggalSesi: true,
      kodeBooking: true,
      paket: { select: { namaPaket: true } },
      vendor: { select: { namaStudio: true, waAdmin: true } },
    },
  });

  if (!booking) return notFoundResponse('Booking not found');

  const tanggal = booking.tanggalSesi
    ? new Date(booking.tanggalSesi).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

  const message = encodeURIComponent(
    `Halo ${booking.namaClient} 👋\n\nIni adalah pengingat bahwa sesi foto Anda bersama *${booking.vendor.namaStudio ?? 'kami'}* akan dilaksanakan *besok, ${tanggal}*.\n\nKode Booking: *${booking.kodeBooking}*\nPaket: ${booking.paket?.namaPaket ?? '-'}\n\nMohon hadir tepat waktu. Sampai jumpa! 📸`
  );

  const waNumber = booking.hpClient.replace(/\D/g, '');
  const waUrl = `https://wa.me/${waNumber.startsWith('0') ? '62' + waNumber.slice(1) : waNumber}?text=${message}`;

  return NextResponse.json({ success: true, waUrl });
}
