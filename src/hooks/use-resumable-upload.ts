import { useState, useCallback } from 'react';

export interface UploadResult {
  file: File;
  success: boolean;
  error?: string;
  attempts: number;
}

interface UseResumableUploadOptions {
  maxRetries?: number;
  retryDelay?: number; // Base delay in ms (will use exponential backoff)
  /**
   * Called with a unique ID (not filename) to support duplicate filenames.
   * The ID must be provided via the `fileId` parameter when calling uploadFileWithRetry.
   */
  onProgress?: (fileId: string, progress: number) => void;
  onSuccess?: (fileId: string) => void;
  onError?: (fileId: string, error: string) => void;
}

/**
 * Hook for resumable uploads with retry mechanism
 * Automatically retries failed uploads with exponential backoff
 * Tracks failed uploads and allows manual retry
 */
export function useResumableUpload(options: UseResumableUploadOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onProgress,
    onSuccess,
    onError,
  } = options;

  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Upload a single file with retry logic
   */
  const uploadFileWithRetry = useCallback(
    async (
      file: File,
      uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<void>,
      fileId: string, // Unique ID for this file (not filename - supports duplicate names)
      attempt = 0
    ): Promise<UploadResult> => {
      try {
        await uploadFn(file, (progress) => {
          onProgress?.(fileId, progress); // Use fileId, not file.name
        });

        onSuccess?.(fileId); // Use fileId, not file.name

        return {
          file,
          success: true,
          attempts: attempt + 1,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        // Check if should retry
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          const delay = retryDelay * Math.pow(2, attempt);
          // Silent retry - no console.log in production

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Retry with same fileId
          return uploadFileWithRetry(file, uploadFn, fileId, attempt + 1);
        }

        // Max retries reached
        onError?.(fileId, errorMessage); // Use fileId, not file.name

        return {
          file,
          success: false,
          error: errorMessage,
          attempts: attempt + 1,
        };
      }
    },
    [maxRetries, retryDelay, onProgress, onSuccess, onError]
  );

  /**
   * Upload multiple files with retry mechanism
   */
  const uploadFiles = useCallback(
    async (
      files: File[],
      uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<void>,
      fileIds?: string[] // Optional pre-generated IDs (for state closure safety)
    ) => {
      setIsUploading(true);
      setUploadResults([]);

      const results: UploadResult[] = [];

      // Upload sequentially to avoid overwhelming server
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const fileId = fileIds?.[i] ?? crypto.randomUUID();
        const result = await uploadFileWithRetry(file, uploadFn, fileId);
        results.push(result);
        setUploadResults([...results]); // Update state after each file
      }

      setIsUploading(false);
      return results;
    },
    [uploadFileWithRetry]
  );

  /**
   * Retry only failed uploads
   */
  const retryFailed = useCallback(
    async (uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<void>) => {
      const failedFiles = uploadResults
        .filter((result) => !result.success)
        .map((result) => result.file);

      if (failedFiles.length === 0) {
        return [];
      }

      setIsUploading(true);

      const results: UploadResult[] = [];

      for (const file of failedFiles) {
        const result = await uploadFileWithRetry(file, uploadFn);
        results.push(result);
      }

      // Update upload results using object identity (not filename) for duplicate file safety
      setUploadResults((prev) =>
        prev.map((prevResult) => {
          const newResult = results.find((r) => r.file === prevResult.file);
          return newResult ?? prevResult;
        })
      );

      setIsUploading(false);
      return results;
    },
    [uploadResults, uploadFileWithRetry]
  );

  /**
   * Retry a single failed file
   */
  const retrySingle = useCallback(
    async (
      file: File,
      uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<void>,
      fileId?: string // Optional: provide same ID as original for consistent tracking
    ) => {
      setIsUploading(true);

      // Use provided ID or generate new one
      const id = fileId ?? crypto.randomUUID();
      const result = await uploadFileWithRetry(file, uploadFn, id);

      // Update upload results using object identity (not filename) for robustness
      setUploadResults((prev) =>
        prev.map((prevResult) =>
          prevResult.file === file ? result : prevResult
        )
      );

      setIsUploading(false);
      return result;
    },
    [uploadFileWithRetry]
  );

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    setUploadResults([]);
    setIsUploading(false);
  }, []);

  // Statistics
  const successfulCount = uploadResults.filter((r) => r.success).length;
  const failedCount = uploadResults.filter((r) => !r.success).length;
  
  const stats = {
    total: uploadResults.length,
    successful: successfulCount,
    failed: failedCount,
    successRate:
      uploadResults.length > 0
        ? (successfulCount / uploadResults.length) * 100
        : 0,
  };

  return {
    uploadFiles,
    retryFailed,
    retrySingle,
    reset,
    uploadResults,
    isUploading,
    stats,
    hasFailures: stats.failed > 0,
  };
}

/**
 * Example upload function that can be passed to the hook
 */
/**
 * Higher-order function that creates an upload function for a specific gallery.
 * Returns a function that matches the uploadFn signature expected by useResumableUpload.
 * 
 * @param galleryId - Gallery ID to upload to
 * @param accountId - Cloudinary account ID (required for multi-tenant support)
 * @returns Upload function (file, onProgress) => Promise<void>
 * 
 * @example
 * ```typescript
 * const uploadFn = createUploadFunction(galleryId, selectedAccountId);
 * await uploadFiles(files, uploadFn);
 * ```
 */
export function createUploadFunction(
  galleryId: string,
  accountId: string
): (file: File, onProgress: (progress: number) => void) => Promise<void> {
  return function (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId); // Required for multi-tenant Cloudinary

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      // Success
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Error
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      // Timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Send request
      xhr.open('POST', `/api/admin/galleries/${galleryId}/upload`);
      xhr.timeout = 300000; // 5 minutes timeout
      xhr.send(formData);
    });
  };
}
