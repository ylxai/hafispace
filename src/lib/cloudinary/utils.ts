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
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto,w_400,h_400,f_auto,q_auto/${publicId}`;
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

/**
 * Generate thumbnail URL kecil untuk filmstrip di lightbox (200x200)
 * Menerima full Cloudinary URL untuk konsistensi API dengan fungsi lain
 */
export function generateLightboxThumbnailUrl(url: string): string {
  const cloudName = extractCloudName(url);
  const publicId = extractPublicId(url);
  if (!cloudName || !publicId) return url;
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto,w_200,h_200,f_auto,q_auto/${publicId}`;
}

/**
 * Generate download URL dengan fl_attachment dari Cloudinary URL
 * Validasi URL untuk mencegah XSS — hanya izinkan Cloudinary URL
 */
export function generateDownloadUrl(url: string): string {
  // Validasi: hanya proses URL Cloudinary yang valid untuk mencegah XSS
  // jika url bukan Cloudinary (misal javascript:...), kembalikan string kosong
  if (!url.startsWith("https://res.cloudinary.com/")) return "";
  const cloudName = extractCloudName(url);
  const publicId = extractPublicId(url);
  if (!cloudName || !publicId) return "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/fl_attachment/${publicId}`;
}
