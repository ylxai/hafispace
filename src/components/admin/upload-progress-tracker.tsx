"use client";

import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";
import { useCallback, useState } from "react";

import { createFileId, type FileUploadId } from "@/lib/upload-types";

export type UploadStatus = "pending" | "uploading" | "success" | "error";

export interface FileUploadState {
  id: FileUploadId; // Branded UUID - use createFileId(), NEVER file.name
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

interface UploadProgressTrackerProps {
  files: FileUploadState[];
  onRetry?: (file: File) => void;
}

/**
 * Upload progress tracker with real-time feedback
 * Shows individual file progress, status icons, and retry capability
 */
export function UploadProgressTracker({ files, onRetry }: UploadProgressTrackerProps) {
  const totalFiles = files.length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  const overallProgress = files.reduce((sum, f) => sum + f.progress, 0) / totalFiles;

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">
              Mengupload {totalFiles} foto
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {successCount} berhasil
            {errorCount > 0 && `, ${errorCount} gagal`}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        <div className="mt-2 text-sm text-gray-500">
          {overallProgress.toFixed(0)}% selesai
        </div>
      </div>

      {/* Individual file progress */}
      <div className="bg-white rounded-lg border divide-y max-h-96 overflow-y-auto">
        {files.map((fileState) => (
          <FileProgressItem
            key={fileState.id} // Use stable UUID instead of filename+index
            fileState={fileState}
            onRetry={onRetry}
          />
        ))}
      </div>
    </div>
  );
}

function FileProgressItem({
  fileState,
  onRetry,
}: {
  fileState: FileUploadState;
  onRetry?: (file: File) => void;
}) {
  const { file, status, progress, error } = fileState;

  return (
    <div className="p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className="flex-shrink-0">
          <StatusIcon status={status} />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <span className="text-xs text-gray-500 ml-2">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>

          {/* Progress bar */}
          {status === "uploading" && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Error message */}
          {status === "error" && error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>

        {/* Status text */}
        <div className="flex-shrink-0 text-right">
          {status === "uploading" && (
            <span className="text-sm font-medium text-blue-600">
              {progress}%
            </span>
          )}
          {status === "success" && (
            <span className="text-sm text-green-600">Selesai</span>
          )}
          {status === "error" && onRetry && (
            <button
              onClick={() => onRetry(file)}
              className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              Coba Lagi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: UploadStatus }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-500" />;
    case "uploading":
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    default:
      return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
  }
}

/**
 * Hook for managing upload progress
 */
export function useUploadProgress() {
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);

  const initializeFiles = useCallback((files: File[], preGeneratedIds?: FileUploadId[]) => {
    setFileStates(
      files.map((file, i) => ({
        id: preGeneratedIds?.[i] ?? createFileId(), // Support pre-generated IDs for state closure safety
        file,
        status: "pending" as const,
        progress: 0,
      }))
    );
  }, []);

  // Update by ID (not filename) to avoid conflicts with same-named files
  const updateFileProgress = useCallback((id: FileUploadId, progress: number) => {
    setFileStates((prev) =>
      prev.map((fs) =>
        fs.id === id
          ? { ...fs, status: "uploading" as const, progress }
          : fs
      )
    );
  }, []);

  const markFileSuccess = useCallback((id: FileUploadId) => {
    setFileStates((prev) =>
      prev.map((fs) =>
        fs.id === id
          ? { ...fs, status: "success" as const, progress: 100 }
          : fs
      )
    );
  }, []);

  const markFileError = useCallback((id: FileUploadId, error: string) => {
    setFileStates((prev) =>
      prev.map((fs) =>
        fs.id === id
          ? { ...fs, status: "error" as const, error }
          : fs
      )
    );
  }, []);

  const reset = useCallback(() => {
    setFileStates([]);
  }, []);

  return {
    fileStates,
    initializeFiles,
    updateFileProgress,
    markFileSuccess,
    markFileError,
    reset,
  };
}
