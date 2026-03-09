import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { clientSchema } from "@/lib/api/validation";
import { unauthorizedResponse, validationErrorResponse , parseRequestBody } from "@/lib/api/response";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  // Ekstrak whereClause untuk menghindari duplikasi kondisi filter
  const whereClause = { vendorId: session.user.id };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        instagram: true,
        createdAt: true,
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.client.count({ where: whereClause }),
  ]);

  const formatted = clients.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    instagram: client.instagram,
    totalBooking: client._count.bookings,
    createdAt: client.createdAt.toISOString(),
  }));

  return NextResponse.json({
    items: formatted,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const bodyResult = await parseRequestBody(request);
  if (!bodyResult.ok) return bodyResult.response;
  const parsed = clientSchema.safeParse(bodyResult.data);

  if (!parsed.success) {
    return validationErrorResponse(parsed.error.format());
  }

  const { name, email, phone, instagram } = parsed.data;

  const client = await prisma.client.create({
    data: {
      vendorId: session.user.id,
      name,
      email,
      phone,
      instagram,
    },
  });

  return NextResponse.json(client);
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("id");

  if (!clientId) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Client ID is required" },
      { status: 400 }
    );
  }

  // Verify client belongs to vendor
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      vendorId: session.user.id,
    },
  });

  if (!client) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Client not found" },
      { status: 404 }
    );
  }

  // Check if client has bookings
  const bookingCount = await prisma.booking.count({
    where: { clientId },
  });

  if (bookingCount > 0) {
    return NextResponse.json(
      { 
        code: "HAS_BOOKINGS", 
        message: `Cannot delete client with ${bookingCount} booking(s). Delete bookings first.` 
      },
      { status: 400 }
    );
  }

  // Sertakan vendorId sebagai defense-in-depth — cegah IDOR jika logika di atas diubah
  await prisma.client.delete({
    where: { id: clientId, vendorId: session.user.id },
  });

  return NextResponse.json({ 
    success: true, 
    message: "Client deleted successfully" 
  });
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const bodyResult = await parseRequestBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const { id } = bodyResult.data as { id?: string };

  if (!id) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Client ID is required" },
      { status: 400 }
    );
  }

  const parsed = clientSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.format());
  }

  const { name, email, phone, instagram } = parsed.data;

  // Verify client belongs to vendor
  const existingClient = await prisma.client.findFirst({
    where: {
      id,
      vendorId: session.user.id,
    },
  });

  if (!existingClient) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Client not found" },
      { status: 404 }
    );
  }

  // Sertakan vendorId sebagai defense-in-depth — cegah IDOR jika logika di atas diubah
  const updatedClient = await prisma.client.update({
    where: { id, vendorId: session.user.id },
    data: {
      name,
      email,
      phone,
      instagram,
    },
  });

  return NextResponse.json(updatedClient);
}
