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