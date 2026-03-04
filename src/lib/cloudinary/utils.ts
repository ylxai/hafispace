/**
 * Cloudinary URL utility helpers
 * Shared across gallery/[token]/page.tsx dan selections-modal.tsx
 */

/**
 * Extract cloud name dari Cloudinary URL
 * e.g. https://res.cloudinary.com/mycloud/image/upload/... → "mycloud"
 */
export function extractCloudName(url: string, fallback = ""): string {
  try {
    const match = url.match(/res\.cloudinary\.com\/([^/]+)/);
    return match?.[1] ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Extract public ID dari Cloudinary URL
 * e.g. https://res.cloudinary.com/mycloud/image/upload/v123/folder/image.jpg → "folder/image"
 */
export function extractPublicId(url: string): string {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

/**
 * Generate thumbnail URL dari cloudName + publicId
 * Dipakai di gallery/[token]/page.tsx
 */
export function generateThumbnailUrl(cloudName: string, publicId: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_400,h_400,q_auto,f_auto/${publicId}`;
}

/**
 * Generate thumbnail URL langsung dari full URL
 * Dipakai di selections-modal.tsx
 */
export function generateThumbnailUrlFromUrl(url: string): string {
  const cloudName = extractCloudName(url);
  const publicId = extractPublicId(url);
  if (!cloudName || !publicId) return url;
  return generateThumbnailUrl(cloudName, publicId);
}
