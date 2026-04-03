import { randomBytes } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { verifyGalleryOwnershipWithSelect } from "@/lib/api/gallery-auth";
import { notFoundResponse, parseRequestBody } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

const updateTokenSchema = z.object({
  action: z.enum(["regenerate", "set-expiry", "clear-expiry"]),
  // expiresAt dalam ISO string, hanya required untuk action "set-expiry"
  expiresAt: z.string().datetime().optional(),
});

// PATCH /api/admin/galleries/:id/token
// Actions: regenerate token, set expiry, clear expiry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: galleryId } = await params;

  const bodyResult = await parseRequestBody(request);
  if (!bodyResult.ok) return bodyResult.response;
  const parsed = updateTokenSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { action, expiresAt } = parsed.data;

  const ownership = await verifyGalleryOwnershipWithSelect(galleryId, user.id, {
    clientToken: true,
    tokenExpiresAt: true,
  });
  if (!ownership.found) return notFoundResponse("Gallery not found");

  let updateData: { clientToken?: string; tokenExpiresAt?: Date | null } = {};

  if (action === "regenerate") {
    // Generate token baru yang kriptografis aman (32 hex chars = 128 bit entropy)
    const newToken = randomBytes(16).toString("hex");
    updateData = { clientToken: newToken };
  } else if (action === "set-expiry") {
    if (!expiresAt) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "expiresAt diperlukan untuk action set-expiry" },
        { status: 400 }
      );
    }
    const expiry = new Date(expiresAt);
    if (expiry <= new Date()) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Tanggal expiry harus di masa depan" },
        { status: 400 }
      );
    }
    updateData = { tokenExpiresAt: expiry };
  } else if (action === "clear-expiry") {
    updateData = { tokenExpiresAt: null };
  }

  const updated = await prisma.gallery.update({
    where: { id: galleryId },
    data: updateData,
    select: { clientToken: true, tokenExpiresAt: true },
  });

  return NextResponse.json({
    clientToken: updated.clientToken,
    tokenExpiresAt: updated.tokenExpiresAt?.toISOString() ?? null,
  });
  } catch (error) {
    return handleApiError(error);
  }
}
