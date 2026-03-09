/**
 * Shared gallery ownership verification helper.
 * Digunakan di semua API admin route yang butuh verifikasi kepemilikan galeri.
 */

import type { Prisma } from "@prisma/client";
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
 * Verifikasi gallery ownership dengan select tambahan.
 * Menggunakan Prisma.GallerySelect untuk type-safe field selection.
 *
 * @example
 * const result = await verifyGalleryOwnershipWithSelect(galleryId, vendorId, {
 *   clientToken: true,
 *   tokenExpiresAt: true,
 * });
 * if (!result.found) return notFoundResponse();
 * const gallery = result.gallery as { id: string; vendorId: string; clientToken: string | null; tokenExpiresAt: Date | null };
 */
export async function verifyGalleryOwnershipWithSelect(
  galleryId: string,
  vendorId: string,
  select: Prisma.GallerySelect
): Promise<{ found: true; gallery: Record<string, unknown> } | { found: false }> {
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId, vendorId },
    select: { id: true, vendorId: true, ...select },
  });

  if (!gallery) return { found: false };
  return { found: true, gallery: gallery as Record<string, unknown> };
}
