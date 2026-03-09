/**
 * Shared gallery ownership verification helper.
 * Digunakan di semua API admin route yang butuh verifikasi kepemilikan galeri.
 */

import { prisma } from "@/lib/db";

type GalleryOwnershipResult =
  | { found: true; gallery: { id: string; vendorId: string } }
  | { found: false };

/**
 * Verifikasi bahwa galeri dengan `galleryId` milik `vendorId`.
 * Jika ditemukan, return { found: true, gallery }.
 * Jika tidak ditemukan atau bukan milik vendor, return { found: false }.
 */
export async function verifyGalleryOwnership(
  galleryId: string,
  vendorId: string
): Promise<GalleryOwnershipResult> {
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId, vendorId },
    select: { id: true, vendorId: true },
  });

  if (!gallery) return { found: false };
  return { found: true, gallery };
}

/**
 * Verifikasi gallery ownership dengan include tambahan.
 * Untuk kasus yang butuh data gallery lebih dari sekedar id & vendorId.
 */
export async function verifyGalleryOwnershipWithSelect<T extends Record<string, unknown>>(
  galleryId: string,
  vendorId: string,
  select: T
): Promise<{ found: true; gallery: Record<string, unknown> } | { found: false }> {
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId, vendorId },
    select: { id: true, vendorId: true, ...select },
  });

  if (!gallery) return { found: false };
  return { found: true, gallery };
}
