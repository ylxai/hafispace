import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api/response";
import { uploadImageToCloudinary } from "@/lib/cloudinary-upload";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { id: bookingId } = await params; // Next.js 15: params adalah Promise

  // Verifikasi booking milik vendor
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vendorId: session.user.id },
    select: { id: true, kodeBooking: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File wajib diupload" }, { status: 400 });

  // Validasi tipe file
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Format file tidak didukung. Gunakan JPG, PNG, atau WEBP." }, { status: 400 });
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadImageToCloudinary(session.user.id, buffer, {
      folder: `hafispace/bukti-bayar/${booking.kodeBooking}`,
      tags: ["bukti-bayar", booking.kodeBooking],
    });

    return NextResponse.json({ url: result.secureUrl });
  } catch (error) {
    console.error("Upload payment proof failed:", error);
    return NextResponse.json({ error: "Gagal mengupload bukti pembayaran." }, { status: 500 });
  }
}
