/**
 * Shared Upload Type Contract
 *
 * This file defines the type contract for the upload system.
 * All components and hooks that deal with file uploads MUST use
 * these types to ensure consistency and prevent runtime bugs.
 *
 * ## Why Branded Types?
 *
 * TypeScript's structural typing allows any `string` to be passed where
 * `string` is expected. This caused a critical bug where `file.name` was
 * passed instead of a UUID, breaking retry tracking silently.
 *
 * Branded types force developers to use `createFileId()` explicitly,
 * making misuse a compile-time error rather than a silent runtime bug.
 *
 * ## The Problem We Solved
 *
 * ```typescript
 * // ❌ Before (silent runtime bug)
 * onProgress(file.name, progress); // Passes TypeScript, breaks at runtime
 *
 * // ✅ After (compile-time error)
 * onProgress(file.name, progress); // TypeScript ERROR: string is not FileUploadId
 * onProgress(createFileId(), progress); // ✅ Correct
 * ```
 *
 * ## Usage Contract
 *
 * 1. ALWAYS generate IDs with `createFileId()` BEFORE calling `initializeFiles()`
 *    (avoids React state closure bug)
 * 2. ALWAYS use `FileUploadId` in callbacks (onProgress, onSuccess, onError)
 * 3. NEVER use `file.name` as an identifier (breaks with duplicate filenames)
 * 4. ALWAYS use object identity `fs.file === file` for file lookup (not name)
 *
 * @example Integration Pattern
 * ```typescript
 * import { createFileId, type FileUploadId } from '@/lib/upload-types';
 * import { useUploadProgress } from '@/components/admin/upload-progress-tracker';
 * import { useResumableUpload, createUploadFunction } from '@/hooks/use-resumable-upload';
 *
 * // Step 1: Generate IDs BEFORE state updates (avoid React closure bug)
 * const fileIds = files.map(() => createFileId());
 *
 * // Step 2: Initialize tracker with pre-generated IDs
 * initializeFiles(files, fileIds);
 *
 * // Step 3: Upload with retry using same IDs
 * const uploadFn = createUploadFunction(galleryId, selectedAccountId);
 * const results = await uploadFiles(files, uploadFn, fileIds);
 *
 * // Step 4: Retry with same ID for tracking continuity
 * const fileState = fileStates.find((fs) => fs.file === file); // Object identity!
 * await retrySingle(file, uploadFn, fileState.id);
 * ```
 */

/**
 * Branded type for unique file upload identifiers.
 *
 * MUST be created with `createFileId()` - never use raw strings or filenames.
 *
 * The brand `{ readonly __brand: 'FileUploadId' }` makes this type
 * incompatible with plain `string`, forcing explicit use of `createFileId()`.
 *
 * @example
 * ```typescript
 * const id: FileUploadId = createFileId(); // ✅ Correct
 * const id: FileUploadId = file.name;      // ❌ TypeScript ERROR
 * const id: FileUploadId = "some-string";  // ❌ TypeScript ERROR
 * ```
 */
export type FileUploadId = string & { readonly __brand: "FileUploadId" };

/**
 * Create a unique file upload ID using crypto.randomUUID().
 *
 * Edge-compatible (no Node.js dependency).
 * Always generates a new UUID - never reuse IDs across uploads.
 *
 * @returns A new unique FileUploadId
 *
 * @example
 * ```typescript
 * // Generate IDs for a batch of files
 * const fileIds = files.map(() => createFileId());
 *
 * // Generate a single ID
 * const id = createFileId();
 * ```
 */
export function createFileId(): FileUploadId {
  return crypto.randomUUID() as FileUploadId;
}

/**
 * Upload progress callback interface.
 *
 * All callbacks use `FileUploadId` (UUID), NEVER filename.
 * Implement this when integrating useResumableUpload with useUploadProgress.
 *
 * @example
 * ```typescript
 * const callbacks: UploadProgressCallbacks = {
 *   onProgress: (id, progress) => updateFileProgress(id, progress),
 *   onSuccess: (id) => markFileSuccess(id),
 *   onError: (id, error) => markFileError(id, error),
 * };
 * ```
 */
export interface UploadProgressCallbacks {
  /** Called when file upload progress updates (0-100) */
  onProgress?: (fileId: FileUploadId, progress: number) => void;
  /** Called when file upload completes successfully */
  onSuccess?: (fileId: FileUploadId) => void;
  /** Called when file upload fails after all retries */
  onError?: (fileId: FileUploadId, error: string) => void;
}

/**
 * Upload result for a single file.
 *
 * Includes `id: FileUploadId` to maintain tracking continuity across retries.
 * This ensures retryFailed() can reuse the same ID for progress updates,
 * preventing UI state from showing duplicate entries for the same file.
 */
export interface FileUploadResult {
  /** Unique identifier for tracking (same ID as used in progress callbacks) */
  id: FileUploadId;
  /** The original File object (use for object identity comparison) */
  file: File;
  /** Whether the upload succeeded */
  success: boolean;
  /** Error message if upload failed */
  error?: string;
  /** Number of attempts made (including retries) */
  attempts: number;
}
