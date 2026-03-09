import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse, validationErrorResponse, notFoundResponse , parseRequestBody } from "@/lib/api/response";
import { z } from "zod";

const paymentSchema = z.object({
  jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  tipe: z.enum(["DP", "PELUNASAN", "LAINNYA"]).default("DP"),
  keterangan: z.string().optional(),
  buktiBayar: z
    .string()
    .url("Link bukti transfer harus berupa URL yang valid")
    .refine(
      (url) => url.startsWith("https://res.cloudinary.com/"),
      "Bukti transfer harus diupload melalui sistem (Cloudinary URL)"
    ),
});

// GET — list payments per booking
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { id: bookingId } = await params;

  // Verifikasi booking milik vendor
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vendorId: session.user.id },
    select: {
      id: true,
      namaClient: true,
      kodeBooking: true,
      hargaPaket: true,
      status: true,
    },
  });

  if (!booking) return notFoundResponse("Booking not found");

  // Query payments terpisah (relasi baru, perlu migration ke DB dulu)
  const payments = await prisma.payment.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      jumlah: true,
      tipe: true,
      keterangan: true,
      buktiBayar: true,
      createdAt: true,
    },
  });

  const totalBayar = payments.reduce((sum, p) => sum + Number(p.jumlah), 0);
  const hargaPaket = Number(booking.hargaPaket ?? 0);
  const sisaTagihan = Math.max(0, hargaPaket - totalBayar);

  return NextResponse.json({
    booking: {
      id: booking.id,
      namaClient: booking.namaClient,
      kodeBooking: booking.kodeBooking,
      hargaPaket,
    },
    payments,
    summary: {
      totalBayar,
      sisaTagihan,
      lunas: sisaTagihan === 0 && hargaPaket > 0,
    },
  });
}

// POST — catat pembayaran baru
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { id: bookingId } = await params;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vendorId: session.user.id },
    select: { id: true, hargaPaket: true },
  });
  if (!booking) return notFoundResponse("Booking not found");

  const bodyResult = await parseRequestBody(request);
  if (!bodyResult.ok) return bodyResult.response;
  const parsed = paymentSchema.safeParse(bodyResult.data);
  if (!parsed.success) return validationErrorResponse(parsed.error.format());

  const { jumlah, tipe, keterangan, buktiBayar } = parsed.data;

  const payment = await prisma.payment.create({
    data: {
      bookingId,
      vendorId: session.user.id,
      jumlah,
      tipe,
      keterangan,
      buktiBayar,
    },
  });

  // Hitung total dengan aggregate — 1 query, bukan N+1
  const agg = await prisma.payment.aggregate({
    where: { bookingId },
    _sum: { jumlah: true },
  });
  const totalBayar = Number(agg._sum.jumlah ?? 0);
  const hargaPaket = Number(booking.hargaPaket ?? 0);

  let dpStatus: "UNPAID" | "PAID" | "PARTIAL" = "UNPAID";
  if (totalBayar >= hargaPaket && hargaPaket > 0) {
    dpStatus = "PAID";
  } else if (totalBayar > 0) {
    dpStatus = "PARTIAL";
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { dpStatus, dpAmount: totalBayar },
  });

  return NextResponse.json(payment, { status: 201 });
}

// DELETE — hapus payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { id: bookingId } = await params;
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("paymentId");
  if (!paymentId) return validationErrorResponse("Payment ID required");

  // Verifikasi payment milik vendor
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, bookingId, vendorId: session.user.id },
  });
  if (!payment) return notFoundResponse("Payment not found");

  await prisma.payment.delete({ where: { id: paymentId } });

  // Recalculate dpStatus dengan aggregate — 1 query, bukan N+1
  const [aggResult, booking] = await Promise.all([
    prisma.payment.aggregate({
      where: { bookingId },
      _sum: { jumlah: true },
    }),
    prisma.booking.findUnique({
      where: { id: bookingId },
      select: { hargaPaket: true },
    }),
  ]);

  const totalBayar = Number(aggResult._sum.jumlah ?? 0);

  // Guard: booking mungkin sudah dihapus oleh proses lain (race condition)
  if (!booking) return NextResponse.json({ success: true });

  const hargaPaket = Number(booking.hargaPaket ?? 0);

  let dpStatus: "UNPAID" | "PAID" | "PARTIAL" = "UNPAID";
  if (totalBayar >= hargaPaket && hargaPaket > 0) dpStatus = "PAID";
  else if (totalBayar > 0) dpStatus = "PARTIAL";

  await prisma.booking.update({
    where: { id: bookingId },
    data: { dpStatus, dpAmount: totalBayar },
  });

  return NextResponse.json({ success: true });
}
