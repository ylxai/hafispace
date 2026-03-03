import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { bookingSchema } from "@/lib/api/validation";
import { unauthorizedResponse, validationErrorResponse } from "@/lib/api/response";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const bookings = await prisma.booking.findMany({
    where: { vendorId: session.user.id },
    include: {
      client: true,
      paket: true,
      galleries: true,
    },
    orderBy: { tanggalSesi: "desc" },
  });

  const formatted = bookings.map((booking) => ({
    id: booking.id,
    kodeBooking: booking.kodeBooking,
    namaClient: booking.namaClient,
    clientName: booking.client?.name ?? booking.namaClient,
    hpClient: booking.hpClient,
    emailClient: booking.emailClient,
    paket: booking.paketCustom ?? booking.paket?.namaPaket ?? "Custom",
    tanggalSesi: booking.tanggalSesi.toISOString(),
    lokasiSesi: booking.lokasiSesi,
    status: booking.status,
    dpAmount: booking.dpAmount?.toString() ?? "0",
    galleryCount: booking.galleries.length,
    createdAt: booking.createdAt.toISOString(),
  }));

  return NextResponse.json({ items: formatted });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

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

  try {
    // Generate booking code
    const kodeBooking = `BK-${Date.now().toString(36).toUpperCase()}`;

    // Handle timezone: Convert ISO string to Date, preserve user's date
    const sessionDate = new Date(tanggalSesi);
    // Extract year, month, day from the date
    const year = sessionDate.getUTCFullYear();
    const month = sessionDate.getUTCMonth();
    const day = sessionDate.getUTCDate();
    // Create date at noon UTC to avoid timezone issues
    const normalizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));

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
        maxSelection,
        notes,
        status: "PENDING",
      },
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { 
        code: "DATABASE_ERROR", 
        message: "Failed to create booking. Please try again." 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

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
        message: `Cannot delete booking with ${galleryCount} gallery(ies). Delete galleries first.` 
      },
      { status: 400 }
    );
  }

  await prisma.booking.delete({
    where: { id: bookingId },
  });

  return NextResponse.json({ 
    success: true, 
    message: "Booking deleted successfully" 
  });
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const body = await request.json();
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
  } = body;

  if (!id) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Booking ID is required" },
      { status: 400 }
    );
  }

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

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      namaClient,
      hpClient,
      emailClient,
      paketId,
      paketCustom,
      hargaPaket,
      tanggalSesi: tanggalSesi ? new Date(tanggalSesi + (tanggalSesi.includes("T") ? "" : "T00:00:00.000Z")) : undefined,
      lokasiSesi,
      maxSelection,
      status,
      notes,
    },
  });

  return NextResponse.json(updatedBooking);
}
