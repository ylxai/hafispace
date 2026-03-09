import { v2 as cloudinary } from 'cloudinary';
import { uploadPhotoToCloudinary, getCloudinaryAccount } from './cloudinary';
import type { CloudinaryResource } from '@/types/cloudinary';

// Tidak ada global config mutation di module level.
// Setiap fungsi yang butuh credentials harus pass config per-request.

// Cloudinary upload folder structure
export const CLOUDINARY_FOLDERS = {
  GALLERIES: 'hafispace/galleries',
  PROFILES: 'hafispace/profiles',
  LOGOS: 'hafispace/logos',
};

// Image transformation presets
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
    crop: 'fit' as const,
    quality: 'auto:best',
    format: 'auto',
  },
  FULL_SIZE: {
    quality: 'auto:best',
    format: 'auto',
  },
};

/**
 * Upload single image to Cloudinary with best practices
 * Features:
 * - Automatic format selection (WebP/AVIF)
 * - Quality optimization
 * - Responsive transformations
 * - Folder organization
 * - Unique filenames
 */
export async function uploadImageToCloudinary(
  vendorId: string,
  file: Buffer | string, // Buffer or base64/data URL
  options: {
    accountId?: string;   // Optional: specific Cloudinary account to use
    folder: string;
    publicId?: string;
    overwrite?: boolean;
    tags?: string[];
    context?: Record<string, string>;
    transformation?: Record<string, unknown>;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
  }
): Promise<{
  publicId: string;
  url: string;
  secureUrl: string;
  thumbnailUrl: string;
  originalFilename: string;
  format: string;
  width?: number;
  height?: number;
  size: number;
  resourceType: string;
  accountId: string;
}> {
  try {
    // Get Cloudinary account (tidak perlu configureCloudinary — uploadPhotoToCloudinary handle per-request config)
    const account = await getCloudinaryAccount(vendorId, options.accountId);

    // Use the account's cloudName explicitly for URL generation
    const { cloudName } = account;

    // Upload using cloudinary.ts function (which also configures)
    const result = await uploadPhotoToCloudinary(vendorId, file, options.publicId ?? `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, {
      accountId: options.accountId,
      folder: options.folder,
      overwrite: options.overwrite,
      resourceType: options.resourceType,
    });

    // Generate thumbnail URL dengan explicit cloud name + f_auto untuk WebP/AVIF
    const thumbnailUrl = `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto,w_400,h_400,f_auto,q_auto/${result.publicId}`;


    return {
      publicId: result.publicId,
      url: result.secureUrl,
      secureUrl: result.secureUrl,
      thumbnailUrl,
      originalFilename: result.originalFilename,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.size,
      resourceType: result.resourceType,
      accountId: result.accountId,
    };
  } catch (error) {
    console.error('Error in uploadImageToCloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

/**
 * Upload multiple images with progress tracking
 * Returns results for each file (success or failure)
 */
export async function uploadMultipleImages(
  vendorId: string,
  files: Array<{ file: Buffer | string; filename: string }>,
  options: {
    accountId?: string;
    folder: string;
    tags?: string[];
    context?: Record<string, string>;
  },
  onProgress?: (completed: number, total: number, currentFile: string) => void
): Promise<
  Array<{
    success: boolean;
    filename: string;
    data?: {
      publicId: string;
      url: string;
      thumbnailUrl: string;
      width?: number;
      height?: number;
      size: number;
      accountId?: string;
    };
    error?: string;
  }>
> {
  const results = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const fileItem = files[i];
    if (!fileItem) continue;
    
    const file = fileItem.file;
    const filename = fileItem.filename;

    try {
      const result = await uploadImageToCloudinary(vendorId, file, {
        accountId: options.accountId,
        folder: options.folder,
        tags: options.tags,
        context: options.context,
      });

      results.push({
        success: true,
        filename,
        data: {
          publicId: result.publicId,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          width: result.width,
          height: result.height,
          size: result.size,
          accountId: result.accountId,
        },
      });

      onProgress?.(i + 1, total, filename);
    } catch (error) {
      results.push({
        success: false,
        filename,
        error: error instanceof Error ? error.message : 'Upload failed',
      });

      onProgress?.(i + 1, total, filename);
    }
  }

  return results;
}

/**
 * Generate responsive image URLs for different screen sizes
 * Follows Cloudinary best practices for responsive images
 */
export function getResponsiveImageUrls(publicId: string, options?: {
  widths?: number[];
  formats?: string[];
}): {
  src: string;
  srcSet: string;
  sizes: string;
  thumbnails: { width: number; url: string }[];
} {
  const widths = options?.widths ?? [400, 800, 1200, 1600];
  const format = options?.formats?.[0] ?? 'auto';

  // Generate srcset for different widths
  const srcSet = widths
    .map((width) => {
      const url = cloudinary.url(publicId, {
        width,
        crop: 'limit',
        quality: 'auto:best',
        format,
        secure: true,
      });
      return `${url} ${width}w`;
    })
    .join(', ');

  // Default image URL
  const src = cloudinary.url(publicId, {
    width: 800,
    crop: 'limit',
    quality: 'auto:best',
    format: 'auto',
    secure: true,
  });

  // Sizes attribute for responsive loading
  const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  // Generate thumbnails for different sizes
  const thumbnails = widths.map((width) => ({
    width,
    url: cloudinary.url(publicId, {
      width,
      height: Math.round(width * 0.75), // 4:3 aspect ratio
      crop: 'fill',
      quality: 'auto:good',
      format: 'auto',
      secure: true,
    }),
  }));

  return {
    src,
    srcSet,
    sizes,
    thumbnails,
  };
}

/**
 * @deprecated Gunakan `deletePhotoFromCloudinary` dari `@/lib/cloudinary` untuk multi-tenant.
 * Fungsi ini hanya untuk backward compat dengan single-account setup (tanpa vendorId).
 */
export async function deleteImageFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image',
  config?: { cloud_name?: string; api_key?: string; api_secret?: string }
): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      ...(config ?? {}),
      resource_type: resourceType,
      invalidate: true,
    });

    return result.result === 'ok' || result.result === 'not found';
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
}

/**
 * @deprecated Gunakan `deletePhotosFromCloudinary` dari `@/lib/cloudinary` untuk multi-tenant.
 */
export async function deleteMultipleImages(
  publicIds: string[],
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<{ deleted: string[]; failed: string[] }> {
  const deleted: string[] = [];
  const failed: string[] = [];

  for (const publicId of publicIds) {
    try {
      const success = await deleteImageFromCloudinary(publicId, resourceType);
      if (success) {
        deleted.push(publicId);
      } else {
        failed.push(publicId);
      }
    } catch {
      failed.push(publicId);
    }
  }

  return { deleted, failed };
}

/**
 * @deprecated Gunakan `getPhotoFromCloudinary` dari `@/lib/cloudinary` untuk multi-tenant.
 */
export async function getImageMetadata(publicId: string): Promise<{
  publicId: string;
  width?: number;
  height?: number;
  size: number;
  format: string;
  createdAt: string;
  tags: string[];
  context?: Record<string, string>;
}> {
  try {
    const result = await cloudinary.api.resource(publicId, {
      tags: true,
      context: true,
    });

    return {
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes,
      format: result.format,
      createdAt: result.created_at,
      tags: result.tags ?? [],
      context: result.context?.custom as Record<string, string>,
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    throw new Error('Failed to get image metadata from Cloudinary');
  }
}

/**
 * @deprecated Gunakan `listPhotosFromCloudinary` dari `@/lib/cloudinary` untuk multi-tenant.
 */
export async function listImagesInFolder(options: {
  folder: string;
  maxResults?: number;
  nextCursor?: string;
  tags?: boolean;
}): Promise<{
  items: Array<{
    publicId: string;
    url: string;
    thumbnailUrl: string;
    width?: number;
    height?: number;
    size: number;
    format: string;
    createdAt: string;
    tags?: string[];
  }>;
  nextCursor?: string;
  total: number;
}> {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: options.folder,
      max_results: options.maxResults ?? 500,
      next_cursor: options.nextCursor,
      tags: options.tags ?? true,
    });

    const items = result.resources.map((resource: CloudinaryResource) => ({
      publicId: resource.public_id,
      url: cloudinary.url(resource.public_id, { secure: true }),
      thumbnailUrl: cloudinary.url(resource.public_id, {
        ...TRANSFORMATION_PRESETS.THUMBNAIL,
        secure: true,
      }),
      width: resource.width,
      height: resource.height,
      size: resource.bytes,
      format: resource.format,
      createdAt: resource.created_at,
      tags: resource.tags,
    }));

    return {
      items,
      nextCursor: result.next_cursor,
      total: items.length,
    };
  } catch (error) {
    console.error('Error listing images:', error);
    throw new Error('Failed to list images from Cloudinary');
  }
}

/**
 * @deprecated Gunakan `generateUploadSignature` dari `@/lib/cloudinary` untuk multi-tenant.
 */
export function generateUploadSignature(
  params: Record<string, unknown>,
  _apiKey?: string,
  apiSecret?: string
): string {
  const secret = apiSecret ?? process.env.CLOUDINARY_API_SECRET ?? '';

  return cloudinary.utils.api_sign_request(params, secret);
}

/**
 * Create upload preset (for unsigned uploads)
 * This should be called once during setup
 */
export async function createUploadPreset(
  name: string,
  options: {
    folder: string;
    tags?: string[];
    allowedFormats?: string[];
    maxFileSize?: number; // in bytes
  }
): Promise<void> {
  try {
    await cloudinary.api.create_upload_preset({
      name,
      folder: options.folder,
      tags: options.tags?.join(','),
      allowed_formats: options.allowedFormats,
      max_file_size: options.maxFileSize,
      unsigned: true, // Allow unsigned uploads from client
    });
  } catch (error) {
    console.error('Error creating upload preset:', error);
    // Preset might already exist
  }
}
