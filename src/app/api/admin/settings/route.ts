import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { parseRequestBody, unauthorizedResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";



const settingsSchema = z.object({
  namaStudio: z.string().min(2, "Studio name must be at least 2 characters").optional(),
  phone: z.string().min(6).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  enableViesusEnhancement: z.boolean().optional(),
  // Booking form settings
  waAdmin: z.string().optional().nullable(),
  dpPercentage: z.coerce.number().int().min(0).max(100).optional(),
  rekeningPembayaran: z.string().optional().nullable(),
  syaratKetentuan: z.string().optional().nullable(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Format warna tidak valid").optional(),
  successMessage: z.string().optional().nullable(),
  bookingFormActive: z.boolean().optional(),
  // Notification preferences
  notifEmail: z.boolean().optional(),
  notifNewBooking: z.boolean().optional(),
  notifGalleryDelivered: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const vendor = await prisma.vendor.findUnique({
      where: { id: user.id },
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
      waAdmin: true,
      dpPercentage: true,
      rekeningPembayaran: true,
      syaratKetentuan: true,
      themeColor: true,
      successMessage: true,
      bookingFormActive: true,
      notifEmail: true,
      notifNewBooking: true,
      notifGalleryDelivered: true,
    },
  });

  if (!vendor) return unauthorizedResponse();

  const { enableViesusEnhancement, ...vendorData } = vendor;

  return NextResponse.json({ 
    vendor: vendorData,
    enableViesusEnhancement: enableViesusEnhancement ?? false,
  });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);

  const bodyResult = await parseRequestBody(request);
  if (!bodyResult.ok) return bodyResult.response;
  const parsed = settingsSchema.safeParse(bodyResult.data);

  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { namaStudio, phone, email, enableViesusEnhancement, waAdmin, dpPercentage, rekeningPembayaran, syaratKetentuan, themeColor, successMessage, bookingFormActive, notifEmail, notifNewBooking, notifGalleryDelivered } = parsed.data;

  await prisma.vendor.update({
    where: { id: user.id },
    data: {
      ...(namaStudio !== undefined && { namaStudio }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && email !== "" && { email }),
      ...(enableViesusEnhancement !== undefined && { enableViesusEnhancement }),
      ...(waAdmin !== undefined && { waAdmin }),
      ...(dpPercentage !== undefined && { dpPercentage }),
      ...(rekeningPembayaran !== undefined && { rekeningPembayaran }),
      ...(syaratKetentuan !== undefined && { syaratKetentuan }),
      ...(themeColor !== undefined && { themeColor }),
      ...(successMessage !== undefined && { successMessage }),
      ...(bookingFormActive !== undefined && { bookingFormActive }),
      ...(notifEmail !== undefined && { notifEmail }),
      ...(notifNewBooking !== undefined && { notifNewBooking }),
      ...(notifGalleryDelivered !== undefined && { notifGalleryDelivered }),
    },
  });

  // Return updated vendor data with VIESUS setting
  const updated = await prisma.vendor.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      email: true,
      namaStudio: true,
      phone: true,
      enableViesusEnhancement: true,
      dpPercentage: true,
      rekeningPembayaran: true,
      syaratKetentuan: true,
      themeColor: true,
      successMessage: true,
      bookingFormActive: true,
      notifEmail: true,
      notifNewBooking: true,
      notifGalleryDelivered: true,
    },
  });

  if (!updated) return unauthorizedResponse();

  const { enableViesusEnhancement: updatedViesus, ...updatedVendor } = updated;

  return NextResponse.json({ 
    vendor: updatedVendor,
    enableViesusEnhancement: updatedViesus ?? false,
  });
  } catch (error) {
    return handleApiError(error);
  }
}
