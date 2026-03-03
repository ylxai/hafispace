import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api/response";
import { z } from "zod";



const settingsSchema = z.object({
  namaStudio: z.string().min(2, "Studio name must be at least 2 characters").optional(),
  phone: z.string().min(6).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  enableViesusEnhancement: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const vendor = await prisma.vendor.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      namaStudio: true,
      phone: true,
      logoUrl: true,
      status: true,
      subscriptionType: true,
      subscriptionExpired: true,
      enableViesusEnhancement: true,
      createdAt: true,
    },
  });

  if (!vendor) return unauthorizedResponse();

  const { enableViesusEnhancement, ...vendorData } = vendor;

  return NextResponse.json({ 
    vendor: vendorData,
    enableViesusEnhancement: enableViesusEnhancement ?? false,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { namaStudio, phone, email, enableViesusEnhancement } = parsed.data;

  // Update profile settings if provided
  if (namaStudio !== undefined || phone !== undefined || email !== undefined) {
    await prisma.vendor.update({
      where: { id: session.user.id },
      data: {
        ...(namaStudio !== undefined && { namaStudio }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && email !== "" && { email }),
      },
    });
  }

  // Update VIESUS enhancement setting if provided
  if (enableViesusEnhancement !== undefined) {
    await prisma.vendor.update({
      where: { id: session.user.id },
      data: { enableViesusEnhancement },
    });
  }

  // Return updated vendor data with VIESUS setting
  const updated = await prisma.vendor.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      namaStudio: true,
      phone: true,
      enableViesusEnhancement: true,
    },
  });

  if (!updated) return unauthorizedResponse();

  const { enableViesusEnhancement: updatedViesus, ...updatedVendor } = updated;

  return NextResponse.json({ 
    vendor: updatedVendor,
    enableViesusEnhancement: updatedViesus ?? false,
  });
}
