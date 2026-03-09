import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse, validationErrorResponse, notFoundResponse } from "@/lib/api/response";
import { z } from "zod";

const packageSchema = z.object({
  namaPaket: z.string().min(1, "Nama paket wajib diisi"),
  kategori: z.enum(["PREWED", "WEDDING", "PERSONAL", "EVENT", "LAINNYA"]).default("LAINNYA"),
  harga: z.coerce.number().min(0).default(0),
  deskripsi: z.string().optional(),
  kuotaEdit: z.coerce.number().int().positive().optional().nullable(),
  maxSelection: z.coerce.number().int().min(1).default(40),
  includeCetak: z
    .array(z.object({ nama: z.string(), jumlah: z.coerce.number().int().positive() }))
    .optional()
    .nullable(),
  urutan: z.coerce.number().int().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

// GET — list semua paket milik vendor
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const packages = await prisma.package.findMany({
    where: { vendorId: session.user.id },
    orderBy: [{ kategori: "asc" }, { urutan: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      namaPaket: true,
      kategori: true,
      harga: true,
      deskripsi: true,
      kuotaEdit: true,
      maxSelection: true,
      includeCetak: true,
      urutan: true,
      status: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
  });

  return NextResponse.json({ packages });
}

// POST — buat paket baru
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const body = await request.json();
  const parsed = packageSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error.format());

  const { namaPaket, kategori, harga, deskripsi, kuotaEdit, maxSelection, includeCetak, urutan, status } = parsed.data;

  const newPackage = await prisma.package.create({
    data: {
      vendorId: session.user.id,
      namaPaket,
      kategori,
      harga,
      deskripsi,
      kuotaEdit,
      maxSelection,
      includeCetak: includeCetak ?? undefined,
      urutan,
      status,
    },
  });

  return NextResponse.json(newPackage, { status: 201 });
}

// PUT — update paket
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const body = await request.json();
  const { id } = body as { id?: string };
  if (!id) return validationErrorResponse("Package ID required");

  const parsed = packageSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error.format());

  const existing = await prisma.package.findFirst({
    where: { id, vendorId: session.user.id },
  });
  if (!existing) return notFoundResponse("Package not found");

  const { namaPaket, kategori, harga, deskripsi, kuotaEdit, maxSelection, includeCetak, urutan, status } = parsed.data;

  const updated = await prisma.package.update({
    where: { id },
    data: { namaPaket, kategori, harga, deskripsi, kuotaEdit, maxSelection, includeCetak: includeCetak ?? undefined, urutan, status },
  });

  return NextResponse.json(updated);
}

// DELETE — hapus paket
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return validationErrorResponse("Package ID required");

  const existing = await prisma.package.findFirst({
    where: { id, vendorId: session.user.id },
  });
  if (!existing) return notFoundResponse("Package not found");

  // Cek apakah ada booking yang menggunakan paket ini
  const bookingCount = await prisma.booking.count({ where: { paketId: id } });
  if (bookingCount > 0) {
    return NextResponse.json(
      { error: `Paket digunakan oleh ${bookingCount} booking. Hapus atau ubah paket di booking terlebih dahulu.` },
      { status: 409 }
    );
  }

  await prisma.package.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
