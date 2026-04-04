import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { notFoundResponse, parseAndValidate, validationErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { testCloudinaryConnectionWithCredentials } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

// Zod schemas untuk type-safe validation
const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  cloudName: z.string().min(1, "Cloud name is required").max(100),
  apiKey: z.string().min(1, "API key is required").max(200),
  apiSecret: z.string().min(1, "API secret is required").max(200),
  setAsDefault: z.boolean().optional(),
});

const updateAccountSchema = z.object({
  id: z.string().uuid("Account ID must be a valid UUID"),
  name: z.string().min(1).max(100).optional(),
  setAsDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});


export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const accounts = await prisma.vendorCloudinary.findMany({
      where: { vendorId: user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        cloudName: true,
        isActive: true,
        isDefault: true,
        storageUsed: true,
        createdAt: true,
        // ❌ Jangan select apiKey dan apiSecret untuk security
      },
    });

    const accountsFormatted = accounts.map(acc => ({
      ...acc,
      storageUsed: Number(acc.storageUsed),
    }));

    return NextResponse.json({ accounts: accountsFormatted });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const parsed = await parseAndValidate(request, createAccountSchema);
    if (!parsed.ok) return parsed.response;
    const { name, cloudName, apiKey, apiSecret, setAsDefault } = parsed.data;

    // Test Cloudinary connection first (using helper that doesn't mutate global state)
    const cloudinaryConnected = await testCloudinaryConnectionWithCredentials(
      cloudName,
      apiKey,
      apiSecret
    );

    if (!cloudinaryConnected) {
      return validationErrorResponse("Failed to connect to Cloudinary with provided credentials");
    }

    // If setAsDefault, unset other defaults first
    if (setAsDefault) {
      await prisma.vendorCloudinary.updateMany({
        where: { vendorId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the first account
    const existingCount = await prisma.vendorCloudinary.count({
      where: { vendorId: user.id },
    });

    const isFirstAccount = existingCount === 0;

    // Create new account with encrypted credentials
    const account = await prisma.vendorCloudinary.create({
      data: {
        vendorId: user.id,
        name,
        cloudName,
        apiKey: encrypt(apiKey),      // 🔒 Encrypt before save
        apiSecret: encrypt(apiSecret), // 🔒 Encrypt before save
        isDefault: isFirstAccount || setAsDefault === true,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: "Cloudinary account added successfully",
      account: {
        id: account.id,
        name: account.name,
        cloudName: account.cloudName,
        isDefault: account.isDefault,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const parsed = await parseAndValidate(request, updateAccountSchema);
    if (!parsed.ok) return parsed.response;
    const { id, name, setAsDefault, isActive } = parsed.data;

    // Verify ownership
    const existingAccount = await prisma.vendorCloudinary.findFirst({
      where: { id, vendorId: user.id },
    });

    if (!existingAccount) {
      return notFoundResponse("Account not found");
    }

    // If setting as default, unset other defaults
    if (setAsDefault) {
      await prisma.vendorCloudinary.updateMany({
        where: { vendorId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.vendorCloudinary.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(setAsDefault !== undefined && { isDefault: setAsDefault }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      message: "Account updated successfully",
      account: {
        id: updated.id,
        name: updated.name,
        isDefault: updated.isDefault,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return validationErrorResponse("Account ID is required");
    }

    // Verify ownership
    const existingAccount = await prisma.vendorCloudinary.findFirst({
      where: { id, vendorId: user.id },
    });

    if (!existingAccount) {
      return notFoundResponse("Account not found");
    }

    // Don't allow deleting if it's the only account
    const accountCount = await prisma.vendorCloudinary.count({
      where: { vendorId: user.id },
    });

    if (accountCount <= 1) {
      return NextResponse.json({
        code: "CONFLICT",
        error: "Cannot delete the only account. Add another account first.",
      }, { status: 400 });
    }

    await prisma.vendorCloudinary.delete({
      where: { id },
    });

    // If deleted account was default, set another as default
    if (existingAccount.isDefault) {
      const firstAccount = await prisma.vendorCloudinary.findFirst({
        where: { vendorId: user.id },
      });
      if (firstAccount) {
        await prisma.vendorCloudinary.update({
          where: { id: firstAccount.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
