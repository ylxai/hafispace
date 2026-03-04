import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

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

function generateKodeBooking(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK${year}${month}-${random}`;
}

// GET — ambil info vendor + paket aktif untuk public form
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get("vendorId");

  if (!vendorId) {
    return NextResponse.json({ error: "Vendor ID required" }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId, status: "ACTIVE" },
    select: {
      id: true,
      namaStudio: true,
      logoUrl: true,
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
          label: true,
          tipe: true,
          isRequired: true,
          urutan: true,
        },
      },
    },
  });

  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  if (!vendor.bookingFormActive) {
    return NextResponse.json({ error: "Booking form is not active" }, { status: 403 });
  }

  return NextResponse.json({ vendor });
}

// POST — submit booking baru dari klien
export async function POST(request: NextRequest) {
  const body = await request.json() as { vendorId?: string } & Record<string, unknown>;
  const { vendorId } = body;

  if (!vendorId || typeof vendorId !== "string") {
    return NextResponse.json({ error: "Vendor ID required" }, { status: 400 });
  }

  // Validasi vendor aktif dan form aktif
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId, status: "ACTIVE" },
    select: { id: true, bookingFormActive: true, dpPercentage: true },
  });

  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  if (!vendor.bookingFormActive) {
    return NextResponse.json({ error: "Booking form is not active" }, { status: 403 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validasi gagal", details: parsed.error.format() }, { status: 400 });
  }

  const { namaClient, hpClient, emailClient, tanggalSesi, lokasiSesi, paketId, catatan } = parsed.data;

  // Validasi paket milik vendor
  const paket = await prisma.package.findFirst({
    where: { id: paketId, vendorId, status: "active" },
    select: { id: true, namaPaket: true, harga: true },
  });
  if (!paket) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });

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

  // Generate kode booking unik
  let kodeBooking = generateKodeBooking();
  const existing = await prisma.booking.findFirst({ where: { kodeBooking } });
  if (existing) kodeBooking = generateKodeBooking();

  // Hitung harga DP
  const hargaPaket = Number(paket.harga);
  const dpAmount = Math.ceil((hargaPaket * vendor.dpPercentage) / 100);

  // Buat booking
  const booking = await prisma.booking.create({
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

  return NextResponse.json({
    success: true,
    booking: {
      ...booking,
      dpAmount,
      dpPercentage: vendor.dpPercentage,
    },
  }, { status: 201 });
}
