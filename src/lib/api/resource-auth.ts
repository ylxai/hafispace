/**
 * Resource ownership verification helpers.
 * Defense-in-depth untuk mencegah IDOR attacks.
 */

import { prisma } from "@/lib/db";

type OwnershipResult<T> =
  | { found: true; resource: T }
  | { found: false };

export async function verifyBookingOwnership(
  bookingId: string,
  vendorId: string
): Promise<OwnershipResult<{ id: string; vendorId: string }>> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, vendorId },
    select: { id: true, vendorId: true },
  });

  if (!booking) return { found: false };
  return { found: true, resource: booking };
}

export async function verifyClientOwnership(
  clientId: string,
  vendorId: string
): Promise<OwnershipResult<{ id: string; vendorId: string }>> {
  const client = await prisma.client.findUnique({
    where: { id: clientId, vendorId },
    select: { id: true, vendorId: true },
  });

  if (!client) return { found: false };
  return { found: true, resource: client };
}

export async function verifyPackageOwnership(
  packageId: string,
  vendorId: string
): Promise<OwnershipResult<{ id: string; vendorId: string }>> {
  const pkg = await prisma.package.findUnique({
    where: { id: packageId, vendorId },
    select: { id: true, vendorId: true },
  });

  if (!pkg) return { found: false };
  return { found: true, resource: pkg };
}

export async function verifyPhotoOwnership(
  photoId: string,
  vendorId: string
): Promise<OwnershipResult<{ id: string; galleryId: string }>> {
  const photo = await prisma.photo.findFirst({
    where: {
      id: photoId,
      gallery: { vendorId },
    },
    select: { id: true, galleryId: true },
  });

  if (!photo) return { found: false };
  return { found: true, resource: photo };
}

export async function verifySelectionOwnership(
  selectionId: string,
  vendorId: string
): Promise<OwnershipResult<{ id: string; galleryId: string; fileId: string; filename: string }>> {
  const selection = await prisma.photoSelection.findFirst({
    where: {
      id: selectionId,
      gallery: { vendorId },
    },
    select: { id: true, galleryId: true, fileId: true, filename: true },
  });

  if (!selection) return { found: false };
  return { found: true, resource: selection };
}

export async function verifyPaymentOwnership(
  paymentId: string,
  vendorId: string
): Promise<OwnershipResult<{ id: string; bookingId: string }>> {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      vendorId,
    },
    select: { id: true, bookingId: true },
  });

  if (!payment) return { found: false };
  return { found: true, resource: payment };
}
