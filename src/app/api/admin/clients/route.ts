import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { createPaginationResponse, parsePaginationParams } from "@/lib/api/pagination";
import { verifyClientOwnership } from "@/lib/api/resource-auth";
import { notFoundResponse, parseAndValidate, validationErrorResponse } from "@/lib/api/response";
import { clientSchema } from "@/lib/api/validation";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    const whereClause = { vendorId: user.id };

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
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await parseAndValidate(request, clientSchema);
    if (!result.ok) return result.response;

    const { name, email, phone, instagram } = result.data;

    const client = await prisma.client.create({
      data: {
        vendorId: user.id,
        name,
        email,
        phone,
        instagram,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Support both query param (legacy) and body (new) for consistency
    const { searchParams } = new URL(request.url);
    let clientId = searchParams.get("id");

    if (!clientId) {
      const result = await parseAndValidate(request, z.object({ id: z.string().uuid() }));
      if (!result.ok) return validationErrorResponse("Client ID is required");
      clientId = result.data.id;
    }

    if (!clientId) {
      return validationErrorResponse("Client ID is required");
    }

    const ownership = await verifyClientOwnership(clientId, user.id);
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
      where: { id: clientId, vendorId: user.id },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Client deleted successfully" 
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await parseAndValidate(request, clientSchema.extend({ id: z.string().uuid() }));
    if (!result.ok) return result.response;

    const { id, name, email, phone, instagram } = result.data;

    const ownership = await verifyClientOwnership(id, user.id);
    if (!ownership.found) {
      return notFoundResponse("Client not found");
    }

    const updatedClient = await prisma.client.update({
      where: { id, vendorId: user.id },
      data: { name, email, phone, instagram },
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    return handleApiError(error);
  }
}
