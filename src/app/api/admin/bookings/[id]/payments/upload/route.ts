import { type NextRequest,NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { notFoundResponse, validationErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CLOUDINARY_FOLDERS } from "@/lib/cloudinary/constants";
import { uploadImageToCloudinary } from "@/lib/cloudinary-upload";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: bookingId } = await params;

  // Verifikasi booking milik vendor
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vendorId: user.id },
    select: { id: true, kodeBooking: true },
  });
  if (!booking) return notFoundResponse("Booking not found");

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return validationErrorResponse("File wajib diupload");

  // Validasi tipe file
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];
  if (!allowedTypes.includes(file.type)) {
    return validationErrorResponse("Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.");
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return validationErrorResponse("Ukuran file maksimal 5MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await uploadImageToCloudinary(user.id, buffer, {
    folder: `${CLOUDINARY_FOLDERS.BUKTI_BAYAR}/${booking.kodeBooking}`, // ✅ Using constant for consistency
    tags: ["bukti-bayar", booking.kodeBooking],
  });

  return NextResponse.json({ url: result.secureUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
