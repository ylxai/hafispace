import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { bookingSchema, bookingUpdateSchema } from "@/lib/api/validation";
import { unauthorizedResponse, validationErrorResponse, internalErrorResponse, parseAndValidate, notFoundResponse } from "@/lib/api/response";
import { parsePaginationParams, createPaginationResponse } from "@/lib/api/pagination";
import { verifyBookingOwnership } from "@/lib/api/resource-auth";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { vendorId: session.user.id },
        select: {
          id: true,
          kodeBooking: true,
          namaClient: true,
          hpClient: true,
          emailClient: true,
          paketCustom: true,
          tanggalSesi: true,
          lokasiSesi: true,
          status: true,
          dpAmount: true,
          dpStatus: true,
          hargaPaket: true,
          createdAt: true,
          notes: true,
          maxSelection: true,
          paket: { select: { namaPaket: true } },
          _count: { select: { galleries: true } },
        },
        orderBy: { tanggalSesi: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({
        where: { vendorId: session.user.id },
      }),
    ]);

    const formatted = bookings.map((booking) => ({
      id: booking.id,
      kodeBooking: booking.kodeBooking,
      namaClient: booking.namaClient,
      hpClient: booking.hpClient,
      emailClient: booking.emailClient,
      paket: booking.paketCustom ?? booking.paket?.namaPaket ?? "Custom",
      tanggalSesi: booking.tanggalSesi.toISOString(),
      lokasiSesi: booking.lokasiSesi,
      status: booking.status,
      dpAmount: Number(booking.dpAmount ?? 0),
      dpStatus: booking.dpStatus ?? "UNPAID",
      hargaPaket: Number(booking.hargaPaket ?? 0),
      galleryCount: booking._count.galleries,
      createdAt: booking.createdAt.toISOString(),
      notes: booking.notes,
      maxSelection: booking.maxSelection,
    }));

    return NextResponse.json({
      items: formatted,
      pagination: createPaginationResponse(page, limit, total),
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return internalErrorResponse("Failed to load bookings");
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const result = await parseAndValidate(request, bookingSchema);
    if (!result.ok) return result.response;

    const {
      namaClient,
      hpClient,
      emailClient,
      paketId,
      paketCustom,
      hargaPaket,
      tanggalSesi,
      lokasiSesi,
      maxSelection,
      notes,
    } = result.data;

    const kodeBooking = `BK-${Date.now().toString(36).toUpperCase()}`;

    const sessionDate = new Date(tanggalSesi);
    const year = sessionDate.getUTCFullYear();
    const month = sessionDate.getUTCMonth();
    const day = sessionDate.getUTCDate();
    const normalizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));

    // Ambil maxSelection dari paket jika paketId dipilih
    let resolvedMaxSelection = maxSelection ?? 40;
    if (paketId) {
      // Pastikan paket milik vendor yang sedang login — cegah IDOR
      const paket = await prisma.package.findFirst({
        where: { id: paketId, vendorId: session.user.id },
        select: { maxSelection: true },
      });
      // Tolak jika paket tidak ditemukan atau bukan milik vendor
      if (!paket) {
        return NextResponse.json(
          { code: "NOT_FOUND", message: "Package not found or unauthorized" },
          { status: 404 }
        );
      }
      resolvedMaxSelection = paket.maxSelection;
    }

    const booking = await prisma.booking.create({
      data: {
        vendorId: session.user.id,
        kodeBooking,
        namaClient,
        hpClient,
        emailClient,
        paketId,
        paketCustom,
        hargaPaket,
        tanggalSesi: normalizedDate,
        lokasiSesi,
        maxSelection: resolvedMaxSelection,
        notes,
        status: "PENDING",
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Error creating booking:", error);
    return internalErrorResponse("Failed to create booking");
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("id");

    if (!bookingId) {
      return validationErrorResponse("Booking ID is required");
    }

    const ownership = await verifyBookingOwnership(bookingId, session.user.id);
    if (!ownership.found) {
      return notFoundResponse("Booking not found");
    }

    const galleryCount = await prisma.gallery.count({
      where: { bookingId },
    });

    if (galleryCount > 0) {
      return validationErrorResponse(
        `Cannot delete booking with ${galleryCount} gallery(ies). Delete galleries first.`
      );
    }

    await prisma.booking.delete({
      where: { id: bookingId, vendorId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return internalErrorResponse("Failed to delete booking");
  }
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const result = await parseAndValidate(request, bookingUpdateSchema);
    if (!result.ok) return result.response;

    const {
      id,
      namaClient,
      hpClient,
      emailClient,
      paketId,
      paketCustom,
      hargaPaket,
      tanggalSesi,
      lokasiSesi,
      maxSelection,
      status,
      notes,
    } = result.data;

    const ownership = await verifyBookingOwnership(id, session.user.id);
    if (!ownership.found) {
      return notFoundResponse("Booking not found");
    }

    if (paketId !== undefined && paketId !== null) {
      const paket = await prisma.package.findFirst({
        where: { id: paketId, vendorId: session.user.id },
        select: { id: true },
      });
      if (!paket) {
        return notFoundResponse("Package not found");
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id, vendorId: session.user.id },
      data: {
        ...(namaClient !== undefined && { namaClient }),
        ...(hpClient !== undefined && { hpClient }),
        ...(emailClient !== undefined && { emailClient }),
        ...(paketId !== undefined && { paketId }),
        ...(paketCustom !== undefined && { paketCustom }),
        ...(hargaPaket !== undefined && { hargaPaket }),
        ...(tanggalSesi !== undefined && {
          tanggalSesi: new Date(
            tanggalSesi.includes("T") ? tanggalSesi : `${tanggalSesi}T12:00:00.000Z`
          ),
        }),
        ...(lokasiSesi !== undefined && { lokasiSesi }),
        ...(maxSelection !== undefined && { maxSelection }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Error updating booking:", error);
    return internalErrorResponse("Failed to update booking");
  }
}
