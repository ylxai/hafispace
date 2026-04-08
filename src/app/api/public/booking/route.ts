import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { forbiddenResponse, notFoundResponse, parseRequestBody, validationErrorResponse } from "@/lib/api/response";
import { generateUniqueKodeBooking } from "@/lib/booking-utils";
import { RATE_LIMIT_BOOKING_PER_HOUR } from "@/lib/constants.server";
import { prisma } from "@/lib/db";
import { convertDecimalToNumber } from "@/lib/decimal";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { env } from "@/lib/env";
import logger from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bookingSchema = z.object({
  namaClient: z.string().min(1, "Nama wajib diisi"),
  hpClient: z.string().min(8, "Nomor HP tidak valid"),
  emailClient: z.string().email("Email tidak valid").optional().nullable(),
  tanggalSesi: z.string().min(1, "Tanggal sesi wajib diisi"),
  lokasiSesi: z.string().optional().nullable(),
  paketId: z.string().uuid("Paket tidak valid"),
  catatan: z.string().optional().nullable(),
  customFields: z.record(z.string(), z.string()).optional(),
});

// GET — ambil info vendor + paket aktif untuk public form
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get("vendorId");

  if (!vendorId) {
    return validationErrorResponse("Vendor ID required");
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId, status: "ACTIVE" },
    select: {
      id: true,
      namaStudio: true,
      logoUrl: true,
      waAdmin: true,
      dpPercentage: true,
      rekeningPembayaran: true,
      syaratKetentuan: true,
      themeColor: true,
      successMessage: true,
      bookingFormActive: true,
      packages: {
        where: { status: "active" },
        orderBy: [{ kategori: "asc" }, { urutan: "asc" }],
        select: {
          id: true,
          namaPaket: true,
          kategori: true,
          harga: true,
          deskripsi: true,
          kuotaEdit: true,
          includeCetak: true,
        },
      },
      customFields: {
        where: { isActive: true },
        orderBy: { urutan: "asc" },
        select: {
          id: true,
          namaField: true,
          tipe: true,
          wajib: true,
          urutan: true,
        },
      },
    },
  });

  if (!vendor) return notFoundResponse("Vendor not found");
  if (!vendor.bookingFormActive) {
    return forbiddenResponse("Booking form is not active");
  }

  return NextResponse.json({ vendor: convertDecimalToNumber(vendor) });
}

// POST — submit booking baru dari klien
export async function POST(request: NextRequest) {
  try {
    // Rate limit: maks 5 booking per jam per IP (cegah spam)
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`booking:${ip}`, { limit: RATE_LIMIT_BOOKING_PER_HOUR, windowMs: 60 * 60_000 });
    if (!rl.success) {
      return NextResponse.json(
        { code: "RATE_LIMITED", message: "Terlalu banyak booking. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const bodyResult = await parseRequestBody(request);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.data as { vendorId?: string } & Record<string, unknown>;
    const { vendorId } = body;

    if (!vendorId || typeof vendorId !== "string") {
      return validationErrorResponse("Vendor ID required");
    }

    // Validasi vendor aktif dan form aktif
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId, status: "ACTIVE" },
      select: {
        id: true,
        bookingFormActive: true,
        dpPercentage: true,
        namaStudio: true,
        rekeningPembayaran: true,
      },
    });

    if (!vendor) return notFoundResponse("Vendor not found");
    if (!vendor.bookingFormActive) {
      return forbiddenResponse("Booking form is not active");
    }

    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.format());
    }

    const { namaClient, hpClient, emailClient, tanggalSesi, lokasiSesi, paketId, catatan } = parsed.data;

    // Validasi paket milik vendor
    const paket = await prisma.package.findFirst({
      where: { id: paketId, vendorId, status: "active" },
      select: { id: true, namaPaket: true, harga: true },
    });
    if (!paket) return notFoundResponse("Paket tidak ditemukan");

    // Cari atau buat client berdasarkan phone
    let client = await prisma.client.findFirst({
      where: { vendorId, phone: hpClient },
      select: { id: true },
    });

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (!client) {
      client = await prisma.client.create({
        data: {
          vendorId,
          name: namaClient,
          phone: hpClient,
          email: emailClient ?? undefined,
        },
        select: { id: true },
      });
    }

    // Hitung harga DP
    const hargaPaket = Number(paket.harga);
    const dpAmount = Math.ceil((hargaPaket * vendor.dpPercentage) / 100);

    // Buat booking dengan retry on unique constraint violation
    const booking = await generateUniqueKodeBooking((kodeBooking) => {
      return prisma.booking.create({
        data: {
          vendorId,
          clientId: client.id,
          paketId,
          kodeBooking,
          namaClient,
          hpClient,
          emailClient,
          tanggalSesi: new Date(tanggalSesi),
          lokasiSesi,
          notes: catatan,
          hargaPaket,
          dpStatus: "UNPAID",
          status: "PENDING",
        },
        select: {
          id: true,
          kodeBooking: true,
          namaClient: true,
          tanggalSesi: true,
          status: true,
          hargaPaket: true,
        },
      });
    });

    // Kirim email konfirmasi jika emailClient ada
    // Gunakan await agar email pasti terkirim sebelum serverless function selesai
    // (fire-and-forget tidak aman di serverless — function bisa terminate sebelum email terkirim)
    if (emailClient) {
      const baseUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
      const invoiceUrl = `${baseUrl}/invoice/${booking.kodeBooking}`;
      try {
        await sendBookingConfirmationEmail({
          to: emailClient,
          namaClient,
          kodeBooking: booking.kodeBooking,
          tanggalSesi,
          namaPaket: paket.namaPaket,
          hargaPaket,
          dpAmount,
          dpPercentage: vendor.dpPercentage,
          namaStudio: vendor.namaStudio ?? 'Studio',
          rekeningPembayaran: vendor.rekeningPembayaran,
          invoiceUrl,
        });
      } catch (emailError) {
        // Email gagal tidak boleh batalkan booking yang sudah berhasil dibuat
        logger.error({ err: emailError }, "Gagal mengirim email konfirmasi booking");
      }
    }

    // ✅ FIX #5: Wrap response in convertDecimalToNumber to handle hargaPaket Decimal
    return NextResponse.json(
      convertDecimalToNumber({
        success: true,
        booking: {
          ...booking,
          dpAmount,
          dpPercentage: vendor.dpPercentage,
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
