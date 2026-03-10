import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse, notFoundResponse, parseAndValidate } from "@/lib/api/response";
import { verifyBookingOwnership } from "@/lib/api/resource-auth";
import { z } from "zod";

// GET — detail booking lengkap
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { id } = await params;

  const ownership = await verifyBookingOwnership(id, session.user.id);
  if (!ownership.found) return notFoundResponse("Booking not found");

  const booking = await prisma.booking.findUnique({
    where: { id },
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
      updatedAt: true,
      paketId: true,
      paket: {
        select: {
          id: true,
          namaPaket: true,
          kategori: true,
          harga: true,
          kuotaEdit: true,
          includeCetak: true,
          deskripsi: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          instagram: true,
        },
      },
      payments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          jumlah: true,
          tipe: true,
          keterangan: true,
          buktiBayar: true,
          createdAt: true,
        },
      },
      galleries: {
        select: {
          id: true,
          namaProject: true,
          status: true,
          clientToken: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!booking) return notFoundResponse("Booking not found");

  const totalBayar = booking.payments.reduce((sum, p) => sum + Number(p.jumlah), 0);
  const hargaPaket = Number(booking.hargaPaket ?? 0);
  const sisaTagihan = Math.max(0, hargaPaket - totalBayar);

  return NextResponse.json({
    booking: {
      ...booking,
      hargaPaket,
      dpAmount: Number(booking.dpAmount ?? 0),
      tanggalSesi: booking.tanggalSesi?.toISOString() ?? null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      payments: booking.payments.map((p) => ({
        ...p,
        jumlah: Number(p.jumlah),
        createdAt: new Date(p.createdAt).toISOString(),
      })),
      galleries: booking.galleries.map((g) => ({
        id: g.id,
        namaProject: g.namaProject,
        status: g.status,
        clientToken: g.clientToken,
        createdAt: new Date(g.createdAt).toISOString(),
      })),
    },
    summary: {
      totalBayar,
      sisaTagihan,
      lunas: sisaTagihan === 0 && hargaPaket > 0,
    },
  });
}

// PATCH — update status booking
const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  lokasiSesi: z.string().optional().nullable(),
  tanggalSesi: z.string().optional(),
  hargaPaket: z.coerce.number().optional(),
  notes: z.string().optional().nullable(),
  paketId: z.string().uuid().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { id } = await params;

  const ownership = await verifyBookingOwnership(id, session.user.id);
  if (!ownership.found) return notFoundResponse("Booking not found");

  const result = await parseAndValidate(request, updateSchema);
  if (!result.ok) return result.response;

  const { status, lokasiSesi, tanggalSesi, hargaPaket, notes, paketId } = result.data;

  if (paketId) {
    const paket = await prisma.package.findFirst({
      where: { id: paketId, vendorId: session.user.id },
      select: { id: true },
    });
    if (!paket) return notFoundResponse("Package not found");
  }

  // Sertakan vendorId sebagai defense-in-depth — cegah IDOR jika verifyBookingOwnership dilewati
  const updated = await prisma.booking.update({
    where: { id, vendorId: session.user.id },
    data: {
      ...(status !== undefined && { status }),
      ...(lokasiSesi !== undefined && { lokasiSesi }),
      ...(tanggalSesi !== undefined && { tanggalSesi: new Date(tanggalSesi) }),
      ...(hargaPaket !== undefined && { hargaPaket }),
      ...(notes !== undefined && { notes }),
      ...(paketId !== undefined && { paketId }),
    },
    select: { id: true, status: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}
