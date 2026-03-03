"use client";

import { useCallback, useState, useRef } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useToast } from "@/components/ui/toast";
import Image from "next/image";

interface UploadProgress {
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
}

export function DragDropUpload({ galleryId, onUploadComplete, onCancel }: DragDropUploadProps) {
  const toast = useToast();
  const [files, setFiles] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    // Handle rejected files
    rejectedFiles.forEach((file) => {
      toast.error(`File ${file.file.name} rejected: ${file.errors[0]?.message}`);
    });

    // Add accepted files to queue
    const newFiles: UploadProgress[] = acceptedFiles.map((file) => ({
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

    // Create a hidden file input to select files
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const selectedFiles = Array.from(target.files ?? []) as File[];
      if (selectedFiles.length === 0) return;

      setIsUploading(true);
      abortControllerRef.current = new AbortController();

      try {
        const formData = new FormData();
        selectedFiles.forEach((f) => formData.append("files", f));

        // Simulate progress updates
        const simulateProgress = setInterval(() => {
          setFiles((prev) =>
            prev.map((file) => {
              if (file.status === "uploading" && file.progress < 90) {
                return { ...file, progress: file.progress + Math.random() * 10 };
              }
              return file;
            })
          );
        }, 200);

        const response = await fetch(`/api/admin/galleries/${galleryId}/upload`, {
          method: "POST",
          body: formData,
          signal: abortControllerRef.current?.signal,
        });

        clearInterval(simulateProgress);

        const result = await response.json();

        if (response.ok) {
          // Update file statuses
          setFiles((prev) =>
            prev.map((file) => {
              const uploadedFile = result.photos.find((p: { filename: string }) => p.filename === file.filename);
              if (uploadedFile) {
                return { ...file, status: "completed", progress: 100 };
              }
              const failedFile = result.failed.find((f: { filename: string }) => f.filename === file.filename);
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
        if (error instanceof Error && error.name === "AbortError") {
          toast.info("Upload cancelled");
        } else {
          const errorMessage = error instanceof Error ? error.message : "Upload failed";
          toast.error(errorMessage);
          setFiles((prev) =>
            prev.map((file) =>
              file.status === "uploading" ? { ...file, status: "error", error: errorMessage } : file
            )
          );
        }
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    };
    
    input.click();
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onCancel();
  };

  const completedCount = files.filter((f) => f.status === "completed").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
          isDragActive
            ? "border-sky-500 bg-sky-50"
            : "border-slate-300 hover:border-sky-400 hover:bg-slate-50"
        } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} disabled={isUploading} />
        
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        {isDragActive ? (
          <p className="text-lg font-semibold text-sky-600">Drop photos here...</p>
        ) : (
          <>
            <p className="text-lg font-semibold text-slate-700">
              Drag & drop photos here
            </p>
            <p className="mt-2 text-sm text-slate-500">
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
            <div className="mt-2 flex gap-4 text-xs">
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
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-sky-500 transition-all duration-200"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {file.status === "completed" && (
                    <p className="text-xs text-green-600">✓ Uploaded</p>
                  )}
                  
                  {file.status === "error" && (
                    <p className="text-xs text-red-600">✕ {file.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                {!isUploading && file.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="rounded-full p-1 text-slate-400 hover:text-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isUploading}
            className="rounded-full border border-slate-200 px-6 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || pendingCount === 0}
            className="rounded-full bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {isUploading ? `Uploading... (${completedCount + errorCount}/${files.length})` : `Upload ${pendingCount} File(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
