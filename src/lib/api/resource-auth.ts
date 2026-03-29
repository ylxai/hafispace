/**
 * Resource ownership verification helpers.
 * Defense-in-depth untuk mencegah IDOR attacks.
 */

import { prisma } from "@/lib/db";

type OwnershipResult<T> =
  | { found: true; resource: T }
  | { found: false };

/**
 * Verify that a booking belongs to the specified vendor.
 * Defense-in-depth for IDOR prevention.
 * 
 * @param bookingId - Booking UUID to verify
 * @param vendorId - Vendor UUID who should own the booking
 * @returns Ownership result with resource data if found
 * 
 * @example
 * ```typescript
 * const result = await verifyBookingOwnership(bookingId, session.user.id);
 * if (!result.found) {
 *   return forbiddenResponse("Booking not found or access denied");
 * }
 * // Use result.resource.id safely
 * ```
 */
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

/**
 * Verify that a client belongs to the specified vendor.
 * 
 * @param clientId - Client UUID to verify
 * @param vendorId - Vendor UUID who should own the client
 * @returns Ownership result with resource data if found
 */
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

/**
 * Verify that a package belongs to the specified vendor.
 * 
 * @param packageId - Package UUID to verify
 * @param vendorId - Vendor UUID who should own the package
 * @returns Ownership result with resource data if found
 */
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

/**
 * Verify that a photo belongs to a gallery owned by the specified vendor.
 * 
 * @param photoId - Photo UUID to verify
 * @param vendorId - Vendor UUID who should own the gallery containing the photo
 * @returns Ownership result with resource data if found
 */
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

/**
 * Verify that a photo selection belongs to a gallery owned by the specified vendor.
 * 
 * @param selectionId - Selection UUID to verify
 * @param vendorId - Vendor UUID who should own the gallery containing the selection
 * @returns Ownership result with resource data including fileId and filename if found
 */
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

/**
 * Verify that a payment belongs to the specified vendor.
 * 
 * @param paymentId - Payment UUID to verify
 * @param vendorId - Vendor UUID who should own the payment
 * @returns Ownership result with resource data including bookingId if found
 */
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
