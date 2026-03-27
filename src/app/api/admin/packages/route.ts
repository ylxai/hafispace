import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse, validationErrorResponse, notFoundResponse, parseAndValidate } from "@/lib/api/response";
import { verifyPackageOwnership } from "@/lib/api/resource-auth";
import { packageSchema } from "@/lib/api/validation";
import { z } from "zod";

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

  // Convert Decimal to number for JSON serialization
  const packagesWithNumbers = packages.map(pkg => ({
    ...pkg,
    harga: pkg.harga.toNumber(),
  }));

  return NextResponse.json({ packages: packagesWithNumbers });
}

// POST — buat paket baru
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const result = await parseAndValidate(request, packageSchema);
  if (!result.ok) return result.response;

  const { namaPaket, kategori, harga, deskripsi, kuotaEdit, maxSelection, includeCetak, urutan, status } = result.data;

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

  return NextResponse.json({
    ...newPackage,
    harga: newPackage.harga.toNumber(),
  }, { status: 201 });
}

// PUT — update paket
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const result = await parseAndValidate(request, packageSchema.extend({
    id: z.string().uuid(),
  }));
  if (!result.ok) return result.response;

  const { id, namaPaket, kategori, harga, deskripsi, kuotaEdit, maxSelection, includeCetak, urutan, status } = result.data;

  const ownership = await verifyPackageOwnership(id, session.user.id);
  if (!ownership.found) return notFoundResponse("Package not found");

  const updated = await prisma.package.update({
    where: { id, vendorId: session.user.id },
    data: { namaPaket, kategori, harga, deskripsi, kuotaEdit, maxSelection, includeCetak: includeCetak ?? undefined, urutan, status },
  });

  return NextResponse.json({
    ...updated,
    harga: updated.harga.toNumber(),
  });
}

// DELETE — hapus paket
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return validationErrorResponse("Package ID required");

  const ownership = await verifyPackageOwnership(id, session.user.id);
  if (!ownership.found) return notFoundResponse("Package not found");

  const bookingCount = await prisma.booking.count({ where: { paketId: id } });
  if (bookingCount > 0) {
    return validationErrorResponse(
      `Paket digunakan oleh ${bookingCount} booking. Hapus atau ubah paket di booking terlebih dahulu.`
    );
  }

  await prisma.package.delete({ where: { id, vendorId: session.user.id } });
  return NextResponse.json({ success: true });
}
