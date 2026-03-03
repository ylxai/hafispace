import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { prisma } from './db';
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

// Configure Cloudinary with specific account
export function configureCloudinary(account: CloudinaryAccountConfig) {
  cloudinary.config({
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
  });
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

    // Configure Cloudinary for this account
    configureCloudinary(account);

    // Prepare upload options
    const uploadOptions = {
      folder: options.folder,
      public_id: options.publicId,
      overwrite: options.overwrite,
      resource_type: options.resourceType,
      use_filename: true,
      unique_filename: true,
      filename_override: filename.replace(/\.[^/.]+$/, ""), // Remove extension for filename
    };

    // Upload to Cloudinary
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            console.error("Error uploading to Cloudinary:", error);
            reject(new Error(`Failed to upload photo to Cloudinary: ${error.message ?? 'Unknown error'}`));
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload returned neither result nor error'));
          }
        }
      );

      // If file is a buffer, pass it to the stream
      if (Buffer.isBuffer(file)) {
        uploadStream.end(file);
      } else {
        // If it's a data URL or path, pass it directly to upload
        cloudinary.uploader.upload(
          file as string,
          { ...uploadOptions },
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) {
              console.error("Error uploading to Cloudinary:", error);
              reject(new Error(`Failed to upload photo to Cloudinary: ${error.message ?? 'Unknown error'}`));
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('Upload returned neither result nor error'));
            }
          }
        );
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

    // Configure Cloudinary for this vendor
    cloudinary.config({
      cloud_name: vendorConfig.cloudName,
      api_key: vendorConfig.apiKey,
      api_secret: vendorConfig.apiSecret,
    });

    // Get resource details
    const result = await cloudinary.api.resource(publicId, {
      resource_type: options.resourceType,
    });

    return {
      publicId: result.public_id,
      url: `http://res.cloudinary.com/${vendorConfig.cloudName}/image/upload/${result.public_id}.${result.format}`,
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

    // Configure Cloudinary for this vendor
    cloudinary.config({
      cloud_name: vendorConfig.cloudName,
      api_key: vendorConfig.apiKey,
      api_secret: vendorConfig.apiSecret,
    });

    // Delete the resource
    const result = await cloudinary.uploader.destroy(publicId, {
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
  const deleted: CloudinaryDeletionResult[] = [];
  const failed: CloudinaryDeletionResult[] = [];

  for (const publicId of publicIds) {
    const result = await deletePhotoFromCloudinary(vendorId, publicId, options);
    
    if (result.result === 'ok' || result.result === 'not found') {
      deleted.push(result);
    } else {
      failed.push(result);
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

    // Configure Cloudinary for this vendor
    cloudinary.config({
      cloud_name: vendorConfig.cloudName,
      api_key: vendorConfig.apiKey,
      api_secret: vendorConfig.apiSecret,
    });

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

    // List resources
    const result = await cloudinary.api.resources(searchParams);

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

    // Configure Cloudinary for this vendor
    cloudinary.config({
      cloud_name: vendorConfig.cloudName,
      api_key: vendorConfig.apiKey,
      api_secret: vendorConfig.apiSecret,
    });

    // Try to ping Cloudinary
    const result = await cloudinary.api.ping();

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
export async function testCloudinaryConnectionWithCredentials(
  cloudName: string,
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  try {
    // Create a new Cloudinary instance with provided credentials
    const cloudinaryLib = require('cloudinary').v2;
    
    cloudinaryLib.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    // Try to ping Cloudinary
    const result = await cloudinaryLib.api.ping();

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
export function getViesusEnhancedUrl(publicId: string, options: {
  width?: number;
  height?: number;
  quality?: string | number;
  crop?: string;
} = {}): string {
  const transformation: Array<Record<string, unknown>> = [
    { effect: 'viesus_correct' }
  ];
  
  // Add optional transformations
  if (options.width || options.height) {
    transformation.push({
      width: options.width,
      height: options.height,
      crop: options.crop ?? 'scale'
    });
  }
  
  if (options.quality) {
    transformation.push({ quality: options.quality });
  }
  
  return cloudinary.url(publicId, {
    transformation,
    secure: true
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
    // Get vendor-specific configuration
    const vendorConfig = await getVendorCloudinaryClient(vendorId);

    // Configure Cloudinary for this vendor
    cloudinary.config({
      cloud_name: vendorConfig.cloudName,
      api_key: vendorConfig.apiKey,
      api_secret: vendorConfig.apiSecret,
    });

    // Generate and return the VIESUS-enhanced URL
    return getViesusEnhancedUrl(publicId, options);
  } catch (error) {
    console.error("Error applying VIESUS enhancement:", error);
    throw new Error("Failed to apply VIESUS enhancement to image");
  }
}

// Generate an upload signature for client-side uploads (if needed)
export function generateUploadSignature(vendorId: string, paramsToSign: Record<string, string | number | boolean>): string {
  const signature = cloudinary.utils.api_sign_request(paramsToSign, 
    process.env.CLOUDINARY_API_SECRET!);
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
    const vendorConfig = await getVendorCloudinaryClient(vendorId);

    // Configure Cloudinary for this vendor
    cloudinary.config({
      cloud_name: vendorConfig.cloudName,
      api_key: vendorConfig.apiKey,
      api_secret: vendorConfig.apiSecret,
    });

    // Prepare upload options
    const uploadOptions = {
      folder: options.folder,
      public_id: options.publicId,
      overwrite: options.overwrite,
      resource_type: options.resourceType,
      use_filename: true,
      unique_filename: true,
      filename_override: filename.replace(/\.[^/.]+$/, ""), // Remove extension for filename
    };

    // Upload to Cloudinary
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            console.error("Error uploading to Cloudinary:", error);
            reject(new Error(`Failed to upload photo to Cloudinary: ${error.message ?? 'Unknown error'}`));
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload returned neither result nor error'));
          }
        }
      );

      // If file is a buffer, pass it to the stream
      if (Buffer.isBuffer(file)) {
        uploadStream.end(file);
      } else {
        // If it's a data URL or path, pass it directly to upload
        cloudinary.uploader.upload(
          file as string,
          { ...uploadOptions },
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) {
              console.error("Error uploading to Cloudinary:", error);
              reject(new Error(`Failed to upload photo to Cloudinary: ${error.message ?? 'Unknown error'}`));
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('Upload returned neither result nor error'));
            }
          }
        );
      }
    });

    // Determine if VIESUS should be applied
    const applyViesus = options.applyViesus !== undefined ? options.applyViesus : await isViesusEnhancementEnabled(vendorId);
    
    let viesusEnhancedUrl: string | undefined;
    if (applyViesus && result.resource_type === 'image') {
      // Create URL with VIESUS enhancement
      viesusEnhancedUrl = cloudinary.url(result.public_id, {
        transformation: [
          { effect: 'viesus_correct' },
          { quality: 'auto' }, // Also apply auto quality
        ],
        secure: true
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