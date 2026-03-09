import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";
import { unauthorizedResponse, notFoundResponse, validationErrorResponse, internalErrorResponse } from "@/lib/api/response";

interface CloudinaryAccount {
  name: string;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const accounts = await prisma.vendorCloudinary.findMany({
      where: { vendorId: session.user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        cloudName: true,
        apiKey: true,
        isActive: true,
        isDefault: true,
        storageUsed: true,
        createdAt: true,
      },
    });

    const accountsWithMaskedKey = accounts.map(acc => ({
      ...acc,
      apiKey: acc.apiKey ? `${acc.apiKey.substring(0, 6)}...` : null,
      storageUsed: Number(acc.storageUsed),
    }));

    return NextResponse.json({ accounts: accountsWithMaskedKey });
  } catch (error) {
    console.error("Error fetching Cloudinary accounts:", error);
    return internalErrorResponse("Failed to fetch accounts");
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const { name, cloudName, apiKey, apiSecret, setAsDefault }: CloudinaryAccount & { setAsDefault?: boolean } = await request.json();

    if (!name || !cloudName || !apiKey || !apiSecret) {
      return validationErrorResponse("Missing required fields: name, cloudName, apiKey, apiSecret");
    }

    // Test Cloudinary connection first
    let cloudinaryConnected = false;
    try {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      
      const result = await cloudinary.api.ping();
      cloudinaryConnected = result.status === 'ok';
    } catch (cloudinaryError) {
      console.error("Cloudinary connection test failed:", cloudinaryError);
      return validationErrorResponse("Failed to connect to Cloudinary with provided credentials");
    }
    
    if (!cloudinaryConnected) {
      return validationErrorResponse("Failed to connect to Cloudinary");
    }

    // If setAsDefault, unset other defaults first
    if (setAsDefault) {
      await prisma.vendorCloudinary.updateMany({
        where: { vendorId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the first account
    const existingCount = await prisma.vendorCloudinary.count({
      where: { vendorId: session.user.id },
    });

    const isFirstAccount = existingCount === 0;

    // Create new account
    const account = await prisma.vendorCloudinary.create({
      data: {
        vendorId: session.user.id,
        name,
        cloudName,
        apiKey,
        apiSecret,
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
    console.error("Error adding Cloudinary account:", error);
    return internalErrorResponse("Failed to add Cloudinary account");
  }
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const { id, name, setAsDefault, isActive }: { id: string; name?: string; setAsDefault?: boolean; isActive?: boolean } = await request.json();

    if (!id) {
      return validationErrorResponse("Account ID is required");
    }

    // Verify ownership
    const existingAccount = await prisma.vendorCloudinary.findFirst({
      where: { id, vendorId: session.user.id },
    });

    if (!existingAccount) {
      return notFoundResponse("Account not found");
    }

    // If setting as default, unset other defaults
    if (setAsDefault) {
      await prisma.vendorCloudinary.updateMany({
        where: { vendorId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.vendorCloudinary.update({
      where: { id },
      data: {
        ...(name && { name }),
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
    console.error("Error updating Cloudinary account:", error);
    return internalErrorResponse("Failed to update account");
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return validationErrorResponse("Account ID is required");
    }

    // Verify ownership
    const existingAccount = await prisma.vendorCloudinary.findFirst({
      where: { id, vendorId: session.user.id },
    });

    if (!existingAccount) {
      return notFoundResponse("Account not found");
    }

    // Don't allow deleting if it's the only account
    const accountCount = await prisma.vendorCloudinary.count({
      where: { vendorId: session.user.id },
    });

    if (accountCount <= 1) {
      return NextResponse.json({ 
        error: "Cannot delete the only account. Add another account first." 
      }, { status: 400 });
    }

    await prisma.vendorCloudinary.delete({
      where: { id },
    });

    // If deleted account was default, set another as default
    if (existingAccount.isDefault) {
      const firstAccount = await prisma.vendorCloudinary.findFirst({
        where: { vendorId: session.user.id },
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
    console.error("Error deleting Cloudinary account:", error);
    return internalErrorResponse("Failed to delete account");
  }
}
