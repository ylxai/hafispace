import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse, notFoundResponse, validationErrorResponse } from "@/lib/api/response";
import { uploadImageToCloudinary } from "@/lib/cloudinary-upload";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { id: bookingId } = await params;

  // Verifikasi booking milik vendor
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vendorId: session.user.id },
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

  const result = await uploadImageToCloudinary(session.user.id, buffer, {
    folder: `hafispace/bukti-bayar/${booking.kodeBooking}`,
    tags: ["bukti-bayar", booking.kodeBooking],
  });

  return NextResponse.json({ url: result.secureUrl });
}
