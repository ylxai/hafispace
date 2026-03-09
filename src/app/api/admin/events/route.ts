import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { bookingSchema, bookingUpdateSchema } from "@/lib/api/validation";
import { unauthorizedResponse, validationErrorResponse, internalErrorResponse } from "@/lib/api/response";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const bookings = await prisma.booking.findMany({
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
    });

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

    return NextResponse.json({ items: formatted });
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
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.format());
    }

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
    } = parsed.data;

    // Generate booking code
    const kodeBooking = `BK-${Date.now().toString(36).toUpperCase()}`;

    // Handle timezone: Convert ISO string to Date, preserve user's date
    const sessionDate = new Date(tanggalSesi);
    const year = sessionDate.getUTCFullYear();
    const month = sessionDate.getUTCMonth();
    const day = sessionDate.getUTCDate();
    // Create date at noon UTC to avoid timezone issues
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
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Verify booking belongs to vendor
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        vendorId: session.user.id,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if booking has galleries
    const galleryCount = await prisma.gallery.count({
      where: { bookingId },
    });

    if (galleryCount > 0) {
      return NextResponse.json(
        {
          code: "HAS_GALLERIES",
          message: `Cannot delete booking with ${galleryCount} gallery(ies). Delete galleries first.`,
        },
        { status: 400 }
      );
    }

    await prisma.booking.delete({
      where: { id: bookingId },
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
    const body = await request.json();
    const parsed = bookingUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.format());
    }

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
    } = parsed.data;

    // Verify booking belongs to vendor
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id,
        vendorId: session.user.id,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Booking not found" },
        { status: 404 }
      );
    }

    // Jika paketId diupdate (dan bukan null), verifikasi kepemilikan — cegah IDOR di PUT handler
    if (paketId !== undefined && paketId !== null) {
      const paket = await prisma.package.findFirst({
        where: { id: paketId, vendorId: session.user.id },
        select: { id: true },
      });
      if (!paket) {
        return NextResponse.json(
          { code: "NOT_FOUND", message: "Package not found or unauthorized" },
          { status: 404 }
        );
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
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
