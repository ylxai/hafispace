import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { clientSchema } from "@/lib/api/validation";
import { unauthorizedResponse, validationErrorResponse, parseAndValidate, notFoundResponse } from "@/lib/api/response";
import { parsePaginationParams, createPaginationResponse } from "@/lib/api/pagination";
import { verifyClientOwnership } from "@/lib/api/resource-auth";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePaginationParams(searchParams);

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
    pagination: createPaginationResponse(page, limit, total),
  });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const result = await parseAndValidate(request, clientSchema);
  if (!result.ok) return result.response;

  const { name, email, phone, instagram } = result.data;

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
    return validationErrorResponse("Client ID is required");
  }

  const ownership = await verifyClientOwnership(clientId, session.user.id);
  if (!ownership.found) {
    return notFoundResponse("Client not found");
  }

  const bookingCount = await prisma.booking.count({
    where: { clientId },
  });

  if (bookingCount > 0) {
    return validationErrorResponse(
      `Cannot delete client with ${bookingCount} booking(s). Delete bookings first.`
    );
  }

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

  const result = await parseAndValidate(request, clientSchema.extend({ id: z.string().uuid() }));
  if (!result.ok) return result.response;

  const { id, name, email, phone, instagram } = result.data;

  const ownership = await verifyClientOwnership(id, session.user.id);
  if (!ownership.found) {
    return notFoundResponse("Client not found");
  }

  const updatedClient = await prisma.client.update({
    where: { id, vendorId: session.user.id },
    data: { name, email, phone, instagram },
  });

  return NextResponse.json(updatedClient);
}
