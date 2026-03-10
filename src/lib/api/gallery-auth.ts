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
 * const gallery = result.gallery; // Type-safe!
 */
type GalleryWithSelect<T extends Prisma.GallerySelect> = Prisma.GalleryGetPayload<{ select: T }> & { id: string; vendorId: string };

export async function verifyGalleryOwnershipWithSelect<T extends Prisma.GallerySelect>(
  galleryId: string,
  vendorId: string,
  select: T
): Promise<{ found: true; gallery: GalleryWithSelect<T> } | { found: false }> {
  const gallery = await (prisma.gallery.findUnique({
    where: { id: galleryId, vendorId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: { id: true, vendorId: true, ...select } as any,
  }) as unknown as Promise<GalleryWithSelect<T> | null>);

  if (!gallery) return { found: false };
  return { found: true, gallery };
}
