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
  LOGOS: 'hafispace/logos',
  BUKTI_BAYAR: 'hafispace/bukti-bayar', // Payment proof folder
} as const;

// Image transformation presets for Cloudinary
export const TRANSFORMATION_PRESETS = {
  THUMBNAIL: {
    width: 400,
    height: 400,
    crop: 'fill' as const,
    gravity: 'auto',
    quality: 'auto:good',
    format: 'auto',
  },
  GALLERY_PREVIEW: {
    width: 800,
    height: 600,
    crop: 'fill' as const,
    gravity: 'auto',
    quality: 'auto:good',
    format: 'auto',
  },
  PROFILE_AVATAR: {
    width: 200,
    height: 200,
    crop: 'thumb' as const,
    gravity: 'face',
    quality: 'auto:good',
    format: 'auto',
  },
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

