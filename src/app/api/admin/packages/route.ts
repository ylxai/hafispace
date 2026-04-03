import { type NextRequest,NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { verifyPackageOwnership } from "@/lib/api/resource-auth";
import { notFoundResponse, parseAndValidate, validationErrorResponse } from "@/lib/api/response";
import { packageSchema } from "@/lib/api/validation";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { convertDecimalToNumber } from "@/lib/decimal";

// GET — list semua paket milik vendor
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const packages = await prisma.package.findMany({
      where: { vendorId: user.id },
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

    return NextResponse.json({ packages: convertDecimalToNumber(packages) });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST — buat paket baru
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await parseAndValidate(request, packageSchema);
    if (!result.ok) return result.response;

    const { namaPaket, kategori, harga, deskripsi, kuotaEdit, maxSelection, includeCetak, urutan, status } = result.data;

    const newPackage = await prisma.package.create({
      data: {
        vendorId: user.id,
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

    return NextResponse.json(convertDecimalToNumber(newPackage), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT — update paket
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await parseAndValidate(request, packageSchema.extend({
      id: z.string().uuid(),
    }));
    if (!result.ok) return result.response;

    const { id, namaPaket, kategori, harga, deskripsi, kuotaEdit, maxSelection, includeCetak, urutan, status } = result.data;

    const ownership = await verifyPackageOwnership(id, user.id);
    if (!ownership.found) return notFoundResponse("Package not found");

    const updated = await prisma.package.update({
      where: { id, vendorId: user.id },
      data: { namaPaket, kategori, harga, deskripsi, kuotaEdit, maxSelection, includeCetak: includeCetak ?? undefined, urutan, status },
    });

    return NextResponse.json(convertDecimalToNumber(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE — hapus paket
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return validationErrorResponse("Package ID required");

    const ownership = await verifyPackageOwnership(id, user.id);
    if (!ownership.found) return notFoundResponse("Package not found");

    const bookingCount = await prisma.booking.count({ where: { paketId: id } });
    if (bookingCount > 0) {
      return validationErrorResponse(
        `Paket digunakan oleh ${bookingCount} booking. Hapus atau ubah paket di booking terlebih dahulu.`
      );
    }

    await prisma.package.delete({ where: { id, vendorId: user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
