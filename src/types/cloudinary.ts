// ─── Vendor Cloudinary Account ───────────────────────────────────────────────

/**
 * Vendor Cloudinary account as returned by /api/admin/settings/cloudinary/accounts
 * Single source of truth - replaces local CloudinaryAccount definitions in components
 */
export interface VendorCloudinaryAccount {
  id: string;
  name: string;
  cloudName: string;
  apiKey: string | null;
  isActive: boolean;
  isDefault: boolean;
  storageUsed: number;
  createdAt: string;
}

/**
 * Minimal CloudinaryAccount shape used for upload account selection.
 * Subset of VendorCloudinaryAccount.
 */
export type CloudinaryAccountOption = Pick<VendorCloudinaryAccount, "id" | "name" | "cloudName" | "isDefault">;

// ─── Cloudinary result types ──────────────────────────────────────────────────

// Cloudinary result types

// Resource response type (for API responses like list resources)
export interface CloudinaryResource {
  public_id: string;
  format: string;
  version: number;
  resource_type: 'image' | 'video' | 'raw' | 'auto';
  type: string;
  created_at: string;
  bytes: number;
  width?: number;
  height?: number;
  backup: boolean;
  access_mode: string;
  url: string;
  secure_url: string;
  original_filename: string;
  format_version?: string;
  [key: string]: unknown;
}

export interface CloudinaryResourceResult {
  resources: CloudinaryResource[];
  next_cursor?: string;
  total_count: number;
  updated: number;
  [key: string]: unknown;
}

export interface CloudinaryDeletionResult {
  result: 'ok' | 'not found' | string;
  public_id?: string;
  [key: string]: unknown;
}

export interface CloudinaryPingResult {
  status: 'ok';
  [key: string]: unknown;
}