/**
 * Cloudinary folder structure constants
 * Ensures consistent folder paths across the application
 */

export const CLOUDINARY_FOLDERS = {
  GALLERIES: 'hafispace/galleries',
  UPLOADS: 'hafispace/uploads',
  PROFILES: 'hafispace/profiles',
  BOOKINGS: 'hafispace/bookings',
  PAYMENTS: 'hafispace/payments',
} as const;

export type CloudinaryFolder = (typeof CLOUDINARY_FOLDERS)[keyof typeof CLOUDINARY_FOLDERS];

/**
 * Get vendor gallery folder path
 * @param vendorId - The vendor/studio ID
 * @returns Full folder path for vendor galleries
 */
export function getVendorGalleryFolder(vendorId: string): string {
  return `${CLOUDINARY_FOLDERS.GALLERIES}/${vendorId}`;
}

/**
 * Get gallery-specific folder path
 * @param vendorId - The vendor/studio ID
 * @param galleryId - The gallery ID
 * @returns Full folder path for specific gallery
 */
export function getGalleryFolder(vendorId: string, galleryId: string): string {
  return `${getVendorGalleryFolder(vendorId)}/${galleryId}`;
}
