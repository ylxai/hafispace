import imageCompression from 'browser-image-compression';

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savings: number; // Percentage
  compressionTime: number; // milliseconds
}

/**
 * Optimize image for upload
 * Reduces file size while maintaining quality
 * Target: 5MB max, 4000px max dimension, 90% quality
 * 
 * @param file - Original image file
 * @returns Compression result with optimized file
 */
export async function optimizeForUpload(file: File): Promise<CompressionResult> {
  const startTime = Date.now();
  const originalSize = file.size;

  // Skip compression if file is already small (<1MB)
  if (originalSize < 1024 * 1024) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savings: 0,
      compressionTime: Date.now() - startTime,
    };
  }

  const options = {
    maxSizeMB: 5, // Target 5MB (down from 15MB max)
    maxWidthOrHeight: 4000, // Max dimension (preserve high quality)
    useWebWorker: true, // Use Web Worker for better performance
    fileType: 'image/jpeg' as const,
    initialQuality: 0.9, // High quality (90%)
    alwaysKeepResolution: false,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const compressedSize = compressedFile.size;
    const compressionTime = Date.now() - startTime;

    // Calculate savings
    const savings = originalSize > 0 
      ? ((originalSize - compressedSize) / originalSize) * 100 
      : 0;

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      savings,
      compressionTime,
    };
  } catch {
    // Fallback to original if compression fails (silent - no console in production)
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savings: 0,
      compressionTime: Date.now() - startTime,
    };
  }
}

/**
 * Optimize multiple images in parallel
 * 
 * @param files - Array of image files
 * @param onProgress - Progress callback (current, total)
 * @returns Array of compression results
 */
export async function optimizeMultipleImages(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  let completed = 0;

  // Process in batches of 5 to avoid overwhelming browser
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(file => optimizeForUpload(file))
    );
    
    results.push(...batchResults);
    completed += batch.length;
    
    onProgress?.(completed, files.length);
  }

  return results;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get summary statistics from compression results
 */
export function getCompressionSummary(results: CompressionResult[]) {
  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);
  const totalSavings = totalOriginalSize > 0
    ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100
    : 0;
  // Guard against division by zero for empty arrays
  const avgCompressionTime = results.length > 0
    ? results.reduce((sum, r) => sum + r.compressionTime, 0) / results.length
    : 0;

  return {
    totalFiles: results.length,
    totalOriginalSize,
    totalCompressedSize,
    totalSavings,
    avgCompressionTime,
    totalOriginalSizeFormatted: formatBytes(totalOriginalSize),
    totalCompressedSizeFormatted: formatBytes(totalCompressedSize),
  };
}
