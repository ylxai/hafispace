"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useToast } from "@/components/ui/toast";
import Image from "next/image";

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
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
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

    try {
      const formData = new FormData();
      files.forEach((fileItem) => {
        formData.append("files", fileItem.file);
      });
      formData.append("accountId", selectedAccountId);

      // Update status to uploading
      setFiles((prev) =>
        prev.map((file) => ({ ...file, status: "uploading" as const }))
      );

      // Create cancel function for each file
      const cancelFunctions = new Map<string, () => void>();
      
      // Simulate progress updates with individual cancel support
      const simulateProgress = setInterval(() => {
        setFiles((prev) =>
          prev.map((file) => {
            if (file.status === "uploading" && file.progress < 90) {
              // Create cancel function for this file if it doesn't exist
              if (!cancelFunctions.has(file.filename)) {
                const cancelFn = () => {
                  setFiles(prev => 
                    prev.map(f => 
                      f.filename === file.filename 
                        ? { ...f, status: "pending", progress: 0 } 
                        : f
                    )
                  );
                };
                cancelFunctions.set(file.filename, cancelFn);
              }
              
              return { ...file, progress: file.progress + Math.random() * 10 };
            }
            return file;
          })
        );
      }, 200);

      const response = await fetch(`/api/admin/galleries/${galleryId}/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(simulateProgress);

      const result = await response.json();

      if (response.ok) {
        // Create lookup maps for performance (O(N+M) instead of O(N*M))
        const uploadedMap = new Map<string, { filename: string }>(
          result.photos.map((p: { filename: string }) => [p.filename, p])
        );
        const failedMap = new Map<string, { filename: string; error: string }>(
          result.failed.map((f: { filename: string; error: string }) => [f.filename, f])
        );

        // Update file statuses
        setFiles((prev) =>
          prev.map((file) => {
            const uploadedFile = uploadedMap.get(file.filename);
            if (uploadedFile) {
              return { ...file, status: "completed", progress: 100 };
            }
            const failedFile = failedMap.get(file.filename);
            if (failedFile) {
              return { ...file, status: "error", progress: 0, error: failedFile.error };
            }
            return file;
          })
        );

        setTotalProgress(100);
        toast.success(`${result.stats.successful} photo(s) uploaded successfully!`);
        
        setTimeout(() => {
          onUploadComplete({
            successful: result.stats.successful,
            failed: result.stats.failed,
          });
        }, 1000);
      } else {
        throw new Error(result.error ?? "Upload failed");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      toast.error(errorMessage);
      setFiles((prev) =>
        prev.map((file) =>
          file.status === "uploading" ? { ...file, status: "error", error: errorMessage } : file
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

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

      {/* File List */}
      {files.length > 0 && (
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
