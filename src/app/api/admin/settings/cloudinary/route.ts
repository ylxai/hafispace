import { type NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

/**
 * DEPRECATED: These endpoints were for single Cloudinary account per vendor.
 * Cloudinary credentials have been moved to VendorCloudinary table for multi-account support.
 * Use /api/admin/settings/cloudinary/accounts instead.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Check if vendor has any cloudinary accounts (new multi-account system)
    const accountCount = await prisma.vendorCloudinary.count({
      where: { vendorId: user.id },
    });

    const defaultAccount = await prisma.vendorCloudinary.findFirst({
      where: { vendorId: user.id, isActive: true },
      orderBy: { isDefault: "desc" },
      select: {
        id: true,
        name: true,
        cloudName: true,
        isActive: true,
        isDefault: true,
      },
    });

    return NextResponse.json({
      hasConfig: accountCount > 0,
      accountCount,
      defaultAccount: defaultAccount ?? null,
      // Deprecated fields - kept for backward compatibility
      cloudName: defaultAccount?.cloudName ?? null,
      apiKey: null, // Never expose API key
      _deprecated: "Use /api/admin/settings/cloudinary/accounts for full account management",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST and DELETE are deprecated - use /accounts endpoint
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated. Use POST /api/admin/settings/cloudinary/accounts instead.",
      code: "DEPRECATED",
    },
    { status: 410 } // 410 Gone
  );
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated. Use DELETE /api/admin/settings/cloudinary/accounts?id={accountId} instead.",
      code: "DEPRECATED",
    },
    { status: 410 } // 410 Gone
  );
}
