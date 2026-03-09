import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { prisma } from '../db';
import type { CloudinaryResource, CloudinaryResourceResult, CloudinaryDeletionResult, CloudinaryPingResult } from '@/types/cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Alternative configuration using CLOUDINARY_URL
if (process.env.CLOUDINARY_URL) {
  cloudinary.config(true); // Use environment variable CLOUDINARY_URL
}

// Function to check if VIESUS enhancement is enabled for a vendor
export async function isViesusEnhancementEnabled(vendorId: string): Promise<boolean> {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { enableViesusEnhancement: true },
    });
    return vendor?.enableViesusEnhancement ?? false;
  } catch (error) {
    console.error('Error checking VIESUS enhancement setting:', error);
    return false;
  }
}

// Cloudinary account interface
export interface CloudinaryAccountConfig {
  id: string;
  vendorId: string;
  name: string;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  isActive: boolean;
  isDefault: boolean;
}

// Get Cloudinary account by ID or get default account
export async function getCloudinaryAccount(vendorId: string, accountId?: string): Promise<CloudinaryAccountConfig> {
  let account;

  if (accountId) {
    // Get specific account
    account = await prisma.vendorCloudinary.findFirst({
      where: { id: accountId, vendorId, isActive: true },
    });
  } else {
    // Get default account
    account = await prisma.vendorCloudinary.findFirst({
      where: { vendorId, isActive: true },
      orderBy: { isDefault: 'desc' },
    });
  }

  if (!account) {
    throw new Error("No active Cloudinary account found");
  }

  return {
    id: account.id,
    vendorId: account.vendorId,
    name: account.name,
    cloudName: account.cloudName,
    apiKey: account.apiKey,
    apiSecret: account.apiSecret,
    isActive: account.isActive,
    isDefault: account.isDefault,
  };
}

// Get per-request config object dari account (tidak mutasi global state)
export function getCloudinaryConfig(account: CloudinaryAccountConfig) {
  return {
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
  };
}

// @deprecated — gunakan getCloudinaryConfig() untuk avoid race condition
export function configureCloudinary(account: CloudinaryAccountConfig) {
  cloudinary.config(getCloudinaryConfig(account));
}

// Initialize Cloudinary client for a specific vendor (legacy - uses default account)
export async function getVendorCloudinaryClient(vendorId: string) {
  const account = await getCloudinaryAccount(vendorId);
  
  return {
    cloudName: account.cloudName,
    apiKey: account.apiKey,
    apiSecret: account.apiSecret,
    uploadPreset: `hafispace_${vendorId}`,
    accountId: account.id,
  };
}

// Upload a photo to Cloudinary
export async function uploadPhotoToCloudinary(
  vendorId: string,
  file: Buffer | string, // Can be a buffer or data URL
  filename: string,
  options: {
    accountId?: string;    // Optional: specific Cloudinary account to use
    folder?: string;      // Folder in Cloudinary (e.g., galleries/vendorId/galleryId)
    publicId?: string;    // Custom public ID for the asset
    overwrite?: boolean;  // Whether to overwrite if asset exists
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
  } = {
    folder: `hafispace/galleries/${vendorId}`,
    resourceType: 'image',
    overwrite: false
  }
): Promise<{
  publicId: string;
  url: string;
  secureUrl: string;
  originalFilename: string;
  format: string;
  width?: number;
  height?: number;
  size: number;
  resourceType: string;
  accountId: string;
}> {
  try {
    // Get Cloudinary account (specific or default)
    const account = await getCloudinaryAccount(vendorId, options.accountId);

    // Per-request config — tidak mutasi global state
    const perRequestConfig = getCloudinaryConfig(account);

    // Prepare upload options dengan credentials per-request
    const uploadOptions = {
      ...perRequestConfig,
      folder: options.folder,
      public_id: options.publicId,
      overwrite: options.overwrite,
      resource_type: options.resourceType,
      use_filename: true,
      unique_filename: true,
      filename_override: filename.replace(/\.[^/.]+$/, ""), // Remove extension for filename
    };

    // Upload to Cloudinary
    // Gunakan upload_chunked_stream untuk file > 5MB agar tidak timeout
    const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB per chunk (minimum Cloudinary requirement)
    const USE_CHUNKED = Buffer.isBuffer(file) && file.length > 5 * 1024 * 1024;

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const callback = (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined
      ) => {
        if (error) {
          console.error("Error uploading to Cloudinary:", error);
          reject(new Error(`Failed to upload photo to Cloudinary: ${error.message ?? 'Unknown error'}`));
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('Upload returned neither result nor error'));
        }
      };

      if (Buffer.isBuffer(file)) {
        const stream = USE_CHUNKED
          ? cloudinary.uploader.upload_chunked_stream(
              { ...uploadOptions, chunk_size: CHUNK_SIZE },
              callback
            )
          : cloudinary.uploader.upload_stream(uploadOptions, callback);
        stream.end(file);
      } else {
        // Data URL atau path — pakai upload langsung
        cloudinary.uploader.upload(file as string, { ...uploadOptions }, callback);
      }
    });

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      originalFilename: result.original_filename,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      resourceType: result.resource_type,
      accountId: account.id,
    };
  } catch (error) {
    console.error("Error in uploadPhotoToCloudinary:", error);
    throw new Error("Failed to upload photo to Cloudinary");
  }
}

// Upload multiple photos to Cloudinary
export async function uploadPhotosToCloudinary(
  vendorId: string,
  files: Array<{ file: Buffer | string; filename: string }>,
  options: {
    folder?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
  } = {
    folder: `hafispace/galleries/${vendorId}`,
    resourceType: 'image'
  }
): Promise<Array<{
  publicId: string;
  url: string;
  secureUrl: string;
  originalFilename: string;
  format: string;
  width?: number;
  height?: number;
  size: number;
  resourceType: string;
}>> {
  const results: Array<{
    publicId: string;
    url: string;
    secureUrl: string;
    originalFilename: string;
    format: string;
    width?: number;
    height?: number;
    size: number;
    resourceType: string;
  }> = [];

  for (const { file, filename } of files) {
    try {
      const result = await uploadPhotoToCloudinary(vendorId, file, filename, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to upload file ${filename} to Cloudinary:`, error);
      // Continue with other files even if one fails
    }
  }

  return results;
}

// Get photo details from Cloudinary
export async function getPhotoFromCloudinary(
  vendorId: string,
  publicId: string,
  options: {
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
  } = { resourceType: 'image' }
): Promise<{
  publicId: string;
  url: string;
  secureUrl: string;
  originalFilename: string;
  format: string;
  width?: number;
  height?: number;
  size: number;
  resourceType: string;
  createdAt: string;
  tags: string[];
}> {
  try {
    // Get vendor-specific configuration
    const vendorConfig = await getVendorCloudinaryClient(vendorId);

    // Per-request config — tidak mutasi global state
    const perRequestConfig = {
      cloud_name: vendorConfig.cloudName,
      api_key: vendorConfig.apiKey,
      api_secret: vendorConfig.apiSecret,
    };

    // Get resource details dengan per-request config
    const result = await cloudinary.api.resource(publicId, {
      ...perRequestConfig,
      resource_type: options.resourceType,
    });

    return {
      publicId: result.public_id,
      url: `https://res.cloudinary.com/${vendorConfig.cloudName}/image/upload/${result.public_id}.${result.format}`,
      secureUrl: `https://res.cloudinary.com/${vendorConfig.cloudName}/image/upload/${result.public_id}.${result.format}`,
      originalFilename: result.original_filename,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      resourceType: result.resource_type,
      createdAt: result.created_at,
      tags: result.tags ?? [],
    };
  } catch (error) {
    console.error("Error getting photo from Cloudinary:", error);
    throw new Error("Failed to get photo from Cloudinary");
  }
}

// Delete photo from Cloudinary
export async function deletePhotoFromCloudinary(
  vendorId: string,
  publicId: string,
  options: {
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
  } = { resourceType: 'image' }
): Promise<CloudinaryDeletionResult> {
  try {
    // Get vendor-specific configuration
    const vendorConfig = await getVendorCloudinaryClient(vendorId);

    // Per-request config — tidak mutasi global state
    const perRequestConfig = {
      cloud_name: vendorConfig.cloudName,
      api_key: vendorConfig.apiKey,
      api_secret: vendorConfig.apiSecret,
    };

    // Delete the resource dengan per-request config
    const result = await cloudinary.uploader.destroy(publicId, {
      ...perRequestConfig,
      resource_type: options.resourceType,
      invalidate: true, // Invalidate CDN cache
    });

    const deletionResult: CloudinaryDeletionResult = {
      result: result.result,
      public_id: publicId,
    };

    if (result.result === 'ok' || result.result === 'not found') {
      return deletionResult;
    } else {
      throw new Error(`Failed to delete photo from Cloudinary: ${result.result}`);
    }
  } catch (error) {
    console.error("Error deleting photo from Cloudinary:", error);
    return {
      result: 'error',
      public_id: publicId,
    };
  }
}

// Delete multiple photos from Cloudinary
export async function deletePhotosFromCloudinary(
  vendorId: string,
  publicIds: string[],
  options: {
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
  } = { resourceType: 'image' }
): Promise<{
  deleted: CloudinaryDeletionResult[];
  failed: CloudinaryDeletionResult[];
  summary: {
    total: number;
    deleted: number;
    failed: number;
  };
}> {
  if (publicIds.length === 0) {
    return { deleted: [], failed: [], summary: { total: 0, deleted: 0, failed: 0 } };
  }

  const deleted: CloudinaryDeletionResult[] = [];
  const failed: CloudinaryDeletionResult[] = [];

  // Gunakan delete_resources batch API (max 100 IDs per call) — jauh lebih efisien
  // dibanding loop N API calls per foto
  const vendorConfig = await getVendorCloudinaryClient(vendorId);
  const perRequestConfig = {
    cloud_name: vendorConfig.cloudName,
    api_key: vendorConfig.apiKey,
    api_secret: vendorConfig.apiSecret,
  };
  const BATCH_SIZE = 100;

  for (let i = 0; i < publicIds.length; i += BATCH_SIZE) {
    const batch = publicIds.slice(i, i + BATCH_SIZE);
    try {
      const result = await cloudinary.api.delete_resources(batch, {
        ...perRequestConfig,
        resource_type: options.resourceType ?? 'image',
        invalidate: true,
      }) as { deleted: Record<string, string> };

      for (const publicId of batch) {
        const status = result.deleted[publicId];
        const entry: CloudinaryDeletionResult = { public_id: publicId, result: status ?? 'not found' };
        if (status === 'deleted' || status === 'not found') {
          deleted.push(entry);
        } else {
          failed.push(entry);
        }
      }
    } catch (err) {
      // Jika batch gagal total, tandai semua sebagai failed
      const errorMsg = err instanceof Error ? err.message : 'Batch delete failed';
      for (const publicId of batch) {
        failed.push({ public_id: publicId, result: errorMsg });
      }
    }
  }

  return {
    deleted,
    failed,
    summary: {
      total: publicIds.length,
      deleted: deleted.length,
      failed: failed.length,
    },
  };
}

// List photos from a specific folder in Cloudinary
export async function listPhotosFromCloudinary(
  vendorId: string,
  options: {
    folder?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    maxResults?: number;
    nextCursor?: string;
  } = {
    folder: `hafispace/galleries/${vendorId}`,
    resourceType: 'image',
    maxResults: 500,
  }
): Promise<CloudinaryResourceResult & {
  items: Array<{
    publicId: string;
    url: string;
    secureUrl: string;
    originalFilename: string;
    format: string;
    width?: number;
    height?: number;
    size: number;
    resourceType: string;
    createdAt: string;
  }>;
}> {
  try {
    // Get vendor-specific configuration
    const vendorConfig = await getVendorCloudinaryClient(vendorId);

    // Per-request config — tidak mutasi global state
    const perRequestConfig = {
      cloud_name: vendorConfig.cloudName,
      api_key: vendorConfig.apiKey,
      api_secret: vendorConfig.apiSecret,
    };

    // Prepare search parameters
    const searchParams: {
      resource_type: string;
      max_results: number;
      tags: boolean;
      context: boolean;
      moderations: boolean;
      prefix?: string;
      next_cursor?: string;
    } = {
      resource_type: options.resourceType ?? 'image',
      max_results: options.maxResults ?? 500,
      tags: true,
      context: true,
      moderations: true,
    };

    if (options.folder) {
      // Search for resources in the specific folder
      searchParams.prefix = options.folder;
    }

    if (options.nextCursor) {
      searchParams.next_cursor = options.nextCursor;
    }

    // List resources dengan per-request config
    const result = await cloudinary.api.resources({ ...perRequestConfig, ...searchParams });

    const items = result.resources.map((resource: CloudinaryResource) => ({
      publicId: resource.public_id,
      url: resource.url,
      secureUrl: resource.secure_url,
      originalFilename: resource.original_filename,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      size: resource.bytes,
      resourceType: resource.resource_type,
      createdAt: resource.created_at,
    }));

    return {
      ...result,
      items,
      total_count: result.resources.length,
      updated: Date.now(),
    };
  } catch (error) {
    console.error("Error listing photos from Cloudinary:", error);
    throw new Error("Failed to list photos from Cloudinary");
  }
}

// Test Cloudinary connection for a vendor
export async function testCloudinaryConnection(vendorId: string): Promise<CloudinaryPingResult & { success: boolean }> {
  try {
    // Get vendor-specific configuration
    const vendorConfig = await getVendorCloudinaryClient(vendorId);

    // Per-request config — tidak mutasi global state
    const perRequestConfig = {
      cloud_name: vendorConfig.cloudName,
      api_key: vendorConfig.apiKey,
      api_secret: vendorConfig.apiSecret,
    };

    // Try to ping Cloudinary dengan per-request config
    const result = await cloudinary.api.ping(perRequestConfig);

    return {
      ...result,
      success: result.status === 'ok',
    };
  } catch (error: unknown) {
    console.error("Error testing Cloudinary connection:", error);
    let httpCode = 0;
    if (error && typeof error === 'object' && 'http_code' in error) {
      httpCode = (error as { http_code?: number }).http_code ?? 0;
    }
    return {
      status: 'ok' as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      http_code: httpCode,
      success: false,
    };
  }
}

// Test Cloudinary connection with provided credentials (before saving)
// Menggunakan per-request config — tidak mutasi global state
export async function testCloudinaryConnectionWithCredentials(
  cloudName: string,
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  try {
    // Kirim config langsung ke cloudinary.api.ping() tanpa mutasi global
    const result = await cloudinary.api.ping({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    return result.status === 'ok';
  } catch (error) {
    const err = error as { message?: string; error?: string; http_code?: number };
    console.error("Error testing Cloudinary connection with credentials:", {
      message: err.message,
      error: err.error,
      http_code: err.http_code
    });
    return false;
  }
}

// Get a VIESUS-enhanced URL for an image
// Membangun URL secara manual dengan cloudName eksplisit — tidak mutasi global config
export function getViesusEnhancedUrl(publicId: string, options: {
  cloudName?: string;
  width?: number;
  height?: number;
  quality?: string | number;
  crop?: string;
} = {}): string {
  // Build transformation string
  const parts: string[] = ['e_viesus_correct'];

  if (options.width ?? options.height) {
    const cropMode = options.crop ?? 'scale';
    const dims = [
      options.width ? `w_${options.width}` : null,
      options.height ? `h_${options.height}` : null,
      `c_${cropMode}`,
    ].filter(Boolean).join(',');
    parts.push(dims);
  }

  parts.push(`q_${options.quality ?? 'auto'}`);
  parts.push('f_auto');

  const transformation = parts.join('/');

  // Jika cloudName tersedia, build URL manual (lebih aman untuk multi-tenant)
  if (options.cloudName) {
    return `https://res.cloudinary.com/${options.cloudName}/image/upload/${transformation}/${publicId}`;
  }

  // Fallback ke cloudinary.url() jika cloudName tidak tersedia
  return cloudinary.url(publicId, {
    transformation: [{ effect: 'viesus_correct' }, { quality: options.quality ?? 'auto', fetch_format: 'auto' }],
    secure: true,
  });
}

// Apply VIESUS enhancement to an existing image
export async function applyViesusEnhancement(
  vendorId: string,
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: string | number;
    crop?: string;
  } = {}
): Promise<string> {
  try {
    // Get vendor config untuk cloudName
    const vendorConfig = await getVendorCloudinaryClient(vendorId);

    // Generate URL dengan cloudName eksplisit — tidak pakai cloudinary.url() global
    return getViesusEnhancedUrl(publicId, { ...options, cloudName: vendorConfig.cloudName });
  } catch (error) {
    console.error("Error applying VIESUS enhancement:", error);
    throw new Error("Failed to apply VIESUS enhancement to image");
  }
}

// Generate an upload signature for client-side uploads (if needed)
export function generateUploadSignature(vendorId: string, paramsToSign: Record<string, string | number | boolean>): string {
  const secret = process.env.CLOUDINARY_API_SECRET ?? "";
  const signature = cloudinary.utils.api_sign_request(paramsToSign, secret);
  return signature;
}

// Upload a photo to Cloudinary with VIESUS Enhancement
export async function uploadPhotoToCloudinaryWithViesus(
  vendorId: string,
  file: Buffer | string, // Can be a buffer or data URL
  filename: string,
  options: {
    folder?: string;      // Folder in Cloudinary (e.g., galleries/vendorId/galleryId)
    publicId?: string;    // Custom public ID for the asset
    overwrite?: boolean;  // Whether to overwrite if asset exists
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    applyViesus?: boolean; // Whether to apply VIESUS enhancement
  } = {
    folder: `hafispace/galleries/${vendorId}`,
    resourceType: 'image',
    overwrite: false,
    applyViesus: true, // Default to true
  }
): Promise<{
  publicId: string;
  url: string;
  secureUrl: string;
  originalFilename: string;
  format: string;
  width?: number;
  height?: number;
  size: number;
  resourceType: string;
  viesusEnhancedUrl?: string; // URL with VIESUS enhancement applied
}> {
  try {
    // Get vendor-specific configuration
    const account = await getCloudinaryAccount(vendorId);
    const perRequestConfig = getCloudinaryConfig(account);

    // Prepare upload options dengan per-request config
    const uploadOptions = {
      ...perRequestConfig,
      folder: options.folder,
      public_id: options.publicId,
      overwrite: options.overwrite,
      resource_type: options.resourceType,
      use_filename: true,
      unique_filename: true,
      filename_override: filename.replace(/\.[^/.]+$/, ""),
    };

    // Upload to Cloudinary — chunked untuk file > 5MB
    const CHUNK_SIZE = 6 * 1024 * 1024;
    const USE_CHUNKED = Buffer.isBuffer(file) && file.length > 5 * 1024 * 1024;

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const callback = (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined
      ) => {
        if (error) {
          console.error("Error uploading to Cloudinary:", error);
          reject(new Error(`Failed to upload photo to Cloudinary: ${error.message ?? 'Unknown error'}`));
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('Upload returned neither result nor error'));
        }
      };

      if (Buffer.isBuffer(file)) {
        const stream = USE_CHUNKED
          ? cloudinary.uploader.upload_chunked_stream(
              { ...uploadOptions, chunk_size: CHUNK_SIZE },
              callback
            )
          : cloudinary.uploader.upload_stream(uploadOptions, callback);
        stream.end(file);
      } else {
        cloudinary.uploader.upload(file as string, { ...uploadOptions }, callback);
      }
    });

    // Determine if VIESUS should be applied
    const applyViesus = options.applyViesus ?? await isViesusEnhancementEnabled(vendorId);

    let viesusEnhancedUrl: string | undefined;
    if (applyViesus && result.resource_type === 'image') {
      // Build Viesus URL manual dengan cloudName eksplisit
      viesusEnhancedUrl = getViesusEnhancedUrl(result.public_id, {
        cloudName: account.cloudName,
        quality: 'auto',
      });
    }

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      originalFilename: result.original_filename,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes,
      resourceType: result.resource_type,
      viesusEnhancedUrl,
    };
  } catch (error) {
    console.error("Error in uploadPhotoToCloudinaryWithViesus:", error);
    throw new Error("Failed to upload photo to Cloudinary with VIESUS enhancement");
  }
}