"use client";

import Image from "next/image";
import { useCallback, useEffect,useState } from "react";
import { type FileRejection,useDropzone } from "react-dropzone";

import { UploadProgressTracker, useUploadProgress } from "@/components/admin/upload-progress-tracker";
import { useToast } from "@/components/ui/toast";
import { createUploadFunction, useResumableUpload } from "@/hooks/use-resumable-upload";
import { getCompressionSummary, optimizeMultipleImages } from "@/lib/image-compression";
import { createFileId } from "@/lib/upload-types";

interface CloudinaryAccount {
  id: string;
  name: string;
  cloudName: string;
  isDefault: boolean;
}

interface UploadProgress {
  file: File;
  filename: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  preview?: string;
}

interface DragDropUploadProps {
  galleryId: string;
  onUploadComplete: (stats: { successful: number; failed: number }) => void;
  onCancel: () => void;
  onEditFile?: (file: File, index: number) => void;
}

export function DragDropUpload({ galleryId, onUploadComplete, onCancel, onEditFile }: DragDropUploadProps) {
  const toast = useToast();
  const [files, setFiles] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const [accounts, setAccounts] = useState<CloudinaryAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [compressionProgress, setCompressionProgress] = useState<{ current: number; total: number } | null>(null);
  const [compressionStats, setCompressionStats] = useState<{ totalSavings: number; totalOriginalSizeFormatted: string; totalCompressedSizeFormatted: string } | null>(null);

  // Sprint 1: Upload progress tracking
  const {
    fileStates,
    initializeFiles,
    updateFileProgress,
    markFileSuccess,
    markFileError,
  } = useUploadProgress();

  // Sprint 1: Resumable upload with retry
  const { uploadFiles, retrySingle, hasFailures, isUploading: isRetrying } = useResumableUpload({
    maxRetries: 3,
    retryDelay: 1000,
    onProgress: (id, progress) => updateFileProgress(id, progress),
    onSuccess: (id) => markFileSuccess(id),
    onError: (id, error) => markFileError(id, error),
  });

  // Combined uploading state: local or hook retry
  const isAnyUploading = isUploading || isRetrying;

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch("/api/admin/settings/cloudinary/accounts");
        const data = await res.json();
        if (data.accounts && data.accounts.length > 0) {
          setAccounts(data.accounts);
          const defaultAccount = data.accounts.find((acc: CloudinaryAccount) => acc.isDefault);
          if (defaultAccount) {
            setSelectedAccountId(defaultAccount.id);
          }
        }
      } catch {
        toast.error("Failed to load Cloudinary accounts. Please refresh.");
      }
    }
    fetchAccounts();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    // Handle rejected files
    rejectedFiles.forEach((file) => {
      toast.error(`File ${file.file.name} rejected: ${file.errors[0]?.message}`);
    });

    // Add accepted files to queue (store actual File objects)
    const newFiles: UploadProgress[] = acceptedFiles.map((file) => ({
      file,
      filename: file.name,
      progress: 0,
      status: "pending",
      preview: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".heic", ".heif", ".tiff", ".avif"],
    },
    maxFiles: 100,
    maxSize: 15 * 1024 * 1024, // 15MB
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const file = newFiles[index];
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const clearAll = () => {
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    setFiles([]);
    setTotalProgress(0);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    if (!selectedAccountId) {
      toast.error("Please select a Cloudinary account");
      return;
    }

    setIsUploading(true);
    setCompressionProgress(null);
    setCompressionStats(null);

    try {
      // ─── Step 1: Client-side compression ───────────────────────────────────
      setCompressionProgress({ current: 0, total: files.length });
      
      const compressionResults = await optimizeMultipleImages(
        files.map((f) => f.file),
        (current, total) => setCompressionProgress({ current, total })
      );

      // Show compression stats
      const summary = getCompressionSummary(compressionResults);
      setCompressionStats({
        totalSavings: summary.totalSavings,
        totalOriginalSizeFormatted: summary.totalOriginalSizeFormatted,
        totalCompressedSizeFormatted: summary.totalCompressedSizeFormatted,
      });
      setCompressionProgress(null);

      // ─── Step 2: Initialize progress tracker ────────────────────────────────
      // Generate unique IDs upfront to avoid React state closure issue
      // (fileStates from hook won't be updated until next render)
      const compressedFiles = compressionResults.map((r) => r.file);
      const fileIds = compressedFiles.map(() => createFileId()); // Branded type - use createFileId() not randomUUID

      // Initialize tracker with pre-generated IDs (avoids React state closure issue)
      initializeFiles(compressedFiles, fileIds);

      // ─── Step 3: Upload via hook (includes auto-retry + exponential backoff) ──
      // Pass selectedAccountId for multi-tenant Cloudinary support
      const uploadFn = createUploadFunction(galleryId, selectedAccountId);

      // Use uploadFiles() from hook so initial upload ALSO benefits from retry logic
      const results = await uploadFiles(compressedFiles, uploadFn, fileIds);

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      setTotalProgress(100);

      if (successful > 0) {
        toast.success(`${successful} foto berhasil diupload!${failed > 0 ? ` ${failed} gagal.` : ""}`);
        setTimeout(() => {
          onUploadComplete({ successful, failed });
        }, 1500);
      } else {
        toast.error(`Semua upload gagal. Silakan coba lagi.`);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setCompressionProgress(null);
    }
  };

  /**
   * Retry a specific failed file using resumable upload hook
   */
  const handleRetryFile = useCallback(async (file: File) => {
    // Use object identity (fs.file === file) for robustness with duplicate filenames
    const fileState = fileStates.find((fs) => fs.file === file);
    if (!fileState) return;

    // Pass selectedAccountId for multi-tenant Cloudinary support
    const uploadFn = createUploadFunction(galleryId, selectedAccountId);

    // Pass same fileId for consistent progress tracking
    await retrySingle(file, uploadFn, fileState.id);
  }, [fileStates, retrySingle, galleryId, selectedAccountId]);

  const completedCount = files.filter((f) => f.status === "completed").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-12 ${
          isDragActive
            ? "border-sky-500 bg-sky-50"
            : "border-slate-300 hover:border-sky-400 hover:bg-slate-50"
        } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} disabled={isUploading} />
        
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 sm:h-20 sm:w-20">
          <svg className="h-8 w-8 text-slate-400 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        {isDragActive ? (
          <p className="text-base font-semibold text-sky-600 sm:text-lg">Drop photos here...</p>
        ) : (
          <>
            <p className="text-base font-semibold text-slate-700 sm:text-lg">
              Drag & drop photos here
            </p>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              or click to select (max 100 files, 15MB each)
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Supported: JPEG, PNG, WebP, HEIC, TIFF, AVIF
            </p>
          </>
        )}
      </div>

      {/* Compression Progress */}
      {compressionProgress && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-blue-700">
              Mengoptimasi foto... ({compressionProgress.current}/{compressionProgress.total})
            </span>
          </div>
          <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(compressionProgress.current / compressionProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Compression Stats */}
      {compressionStats && compressionStats.totalSavings > 1 && (
        <div className="rounded-xl bg-green-50 border border-green-100 p-3">
          <p className="text-sm text-green-700">
            ✅ Optimasi selesai — hemat <strong>{compressionStats.totalSavings.toFixed(0)}%</strong>{" "}
            ({compressionStats.totalOriginalSizeFormatted} → {compressionStats.totalCompressedSizeFormatted})
          </p>
        </div>
      )}

      {/* Sprint 1: UploadProgressTracker */}
      {fileStates.length > 0 && (
        <UploadProgressTracker
          files={fileStates}
          onRetry={handleRetryFile}
        />
      )}

      {/* Retry All Failed Button - disabled during any upload/retry */}
      {hasFailures && !isAnyUploading && (
        <button
          type="button"
          onClick={async () => {
            // Sequential retry to avoid overwhelming server (not parallel forEach)
            const failedFiles = fileStates.filter(fs => fs.status === "error").map(fs => fs.file);
            for (const file of failedFiles) {
              await handleRetryFile(file);
            }
          }}
          className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
        >
          🔄 Coba Ulang Semua yang Gagal ({fileStates.filter(fs => fs.status === "error").length} file)
        </button>
      )}

      {/* File List (pre-upload) */}
      {files.length > 0 && fileStates.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              {files.length} file(s) selected
            </p>
            <div className="flex gap-2">
              {!isUploading && pendingCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Progress Stats */}
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-slate-600">Total Progress</span>
              <span className="font-medium text-slate-900">{Math.round(totalProgress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs sm:gap-4">
              <span className="text-green-600">✓ {completedCount} completed</span>
              <span className="text-red-600">✕ {errorCount} failed</span>
              <span className="text-slate-500">◌ {pendingCount} pending</span>
            </div>
          </div>

          {/* Individual File Progress */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.filename}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2"
              >
                {/* Thumbnail */}
                {file.preview && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={file.preview}
                      alt={file.filename}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{file.filename}</p>

                   {file.status === "uploading" && (
                     <div className="mt-1 flex items-center gap-2">
                       <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                         <div
                           className="h-full bg-sky-500 transition-all duration-200"
                           style={{ width: `${file.progress}%` }}
                         />
                       </div>
                       <span className="text-xs text-slate-500">{Math.round(file.progress)}%</span>
                     </div>
                   )}

                  {file.status === "completed" && (
                    <p className="text-xs text-green-600">✓ Uploaded</p>
                  )}

                  {file.status === "error" && (
                    <p className="text-xs text-red-600">✕ {file.error}</p>
                  )}
                </div>

                 {/* Cancel Button */}
                 {file.status === "uploading" && (
                   <button
                     type="button"
                     onClick={() => removeFile(index)}
                     className="rounded-full p-1 text-slate-400 hover:text-red-500"
                     title="Cancel upload"
                   >
                     <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 )}
                 {!isUploading && file.status === "pending" && (
                   <div className="flex items-center gap-1">
                     {onEditFile && (
                       <button
                         type="button"
                         onClick={() => onEditFile(file.file, index)}
                         className="rounded-full p-1 text-slate-400 hover:text-sky-500"
                         title="Edit before upload"
                       >
                         <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                         </svg>
                       </button>
                     )}
                     <button
                       type="button"
                       onClick={() => removeFile(index)}
                       className="rounded-full p-1 text-slate-400 hover:text-red-500"
                     >
                       <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </button>
                   </div>
                 )}

                {/* Status Icon */}
                {file.status === "completed" && (
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {file.status === "error" && (
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          {/* Cloudinary Account Selector */}
          {accounts.length > 0 ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Cloudinary Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.cloudName})
                    {account.isDefault ? " - Default" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              No Cloudinary accounts configured. Please add one in Settings.
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="w-full rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
          >
            {isUploading ? "Uploading..." : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || pendingCount === 0}
            className="w-full rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 disabled:opacity-50 sm:w-auto"
          >
            {isUploading ? `Uploading... (${completedCount + errorCount}/${files.length})` : `Upload ${pendingCount} File(s)`}
          </button>
        </div>
        </div>
      )}
    </div>
  );
}
