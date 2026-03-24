import { prisma } from "./db";

/**
 * Selection count utilities — semua operasi langsung ke database.
 * Redis/Upstash tidak digunakan.
 */

/** Jumlah foto yang dipilih (tidak terkunci) di sebuah gallery */
export async function getSelectionCount(galleryId: string): Promise<number> {
  return prisma.photoSelection.count({
    where: { galleryId, isLocked: false },
  });
}

/** Jumlah total foto yang dipilih termasuk yang terkunci */
export async function getTotalSelectionCount(galleryId: string): Promise<number> {
  return prisma.photoSelection.count({
    where: { galleryId },
  });
}

