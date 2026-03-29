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
  onProgress?: (fileName: string, progress: number) => void;
  onSuccess?: (fileName: string) => void;
  onError?: (fileName: string, error: string) => void;
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
      attempt = 0
    ): Promise<UploadResult> => {
      try {
        await uploadFn(file, (progress) => {
          onProgress?.(file.name, progress);
        });

        onSuccess?.(file.name);

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
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} for ${file.name} in ${delay}ms`);

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Retry
          return uploadFileWithRetry(file, uploadFn, attempt + 1);
        }

        // Max retries reached
        onError?.(file.name, errorMessage);

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
      uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<void>
    ) => {
      setIsUploading(true);
      setUploadResults([]);

      const results: UploadResult[] = [];

      // Upload sequentially to avoid overwhelming server
      for (const file of files) {
        const result = await uploadFileWithRetry(file, uploadFn);
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

      // Update upload results (replace failed with new attempts)
      setUploadResults((prev) =>
        prev.map((prevResult) => {
          const newResult = results.find((r) => r.file.name === prevResult.file.name);
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
      uploadFn: (file: File, onProgress: (progress: number) => void) => Promise<void>
    ) => {
      setIsUploading(true);

      const result = await uploadFileWithRetry(file, uploadFn);

      // Update upload results
      setUploadResults((prev) =>
        prev.map((prevResult) =>
          prevResult.file.name === file.name ? result : prevResult
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
export async function createUploadFunction(
  galleryId: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

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
}
