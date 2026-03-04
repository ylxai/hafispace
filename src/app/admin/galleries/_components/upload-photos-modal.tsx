"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SUCCESS_FEEDBACK_DURATION_MS } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";
import { ImageEditor } from "@/components/admin/image-editor";
import { DragDropUpload } from "@/components/admin/drag-drop-upload";

type AdminGallery = {
  id: string;
  namaProject: string;
  status: "DRAFT" | "IN_REVIEW" | "DELIVERED";
  clientToken: string;
  viewCount: number;
  photoCount: number;
  selectionCount: number;
  clientName: string;
  createdAt: string;
};



export function UploadPhotosModal({ gallery, onClose }: { gallery: AdminGallery; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showEditor, setShowEditor] = useState<{ file: File; index: number } | null>(null);
  const [uploadStats, setUploadStats] = useState<{ successful: number; failed: number } | null>(null);
  const [editedFiles, setEditedFiles] = useState<Map<number, File>>(new Map());

  const handleUploadComplete = (stats: { successful: number; failed: number }) => {
    setUploadStats(stats);
    queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
    if (stats.successful > 0 && stats.failed === 0) {
      setTimeout(() => { onClose(); }, SUCCESS_FEEDBACK_DURATION_MS);
    }
  };

  const handleEditFile = (file: File, index: number) => {
    setShowEditor({ file, index });
  };

  const handleEditComplete = (editedFile: File) => {
    if (!showEditor) return;
    // Simpan edited file untuk dikirim ke DragDropUpload
    setEditedFiles((prev) => new Map(prev).set(showEditor.index, editedFile));
    setShowEditor(null);
    toast.success("Image edited — siap di-upload!");
  };

  void editedFiles; // akan digunakan di DragDropUpload ketika mendukung file replacement

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upload Photos to Gallery</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:text-slate-600" aria-label="Close">✕</button>
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 p-4">
          <p className="text-base font-semibold text-slate-900">{gallery.namaProject}</p>
          <p className="text-sm text-slate-600">Client: {gallery.clientName}</p>
          <div className="mt-2 flex gap-4 text-xs text-slate-500">
            <span>{gallery.photoCount} existing photos</span>
            <span>{gallery.selectionCount} selections</span>
            <span>{gallery.viewCount} views</span>
          </div>
        </div>

        {showEditor ? (
          <ImageEditor
            file={showEditor.file}
            onEditComplete={handleEditComplete}
            onCancel={() => setShowEditor(null)}
          />
        ) : (
          <DragDropUpload
            galleryId={gallery.id}
            onUploadComplete={handleUploadComplete}
            onCancel={onClose}
            onEditFile={handleEditFile}
          />
        )}

        {uploadStats && (
          <div className="mt-4 rounded-xl bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              ✓ Upload complete: {uploadStats.successful} successful, {uploadStats.failed} failed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

