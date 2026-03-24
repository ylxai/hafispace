"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useToast } from "@/components/ui/toast";
import { DeleteConfirmationModal } from "@/components/admin/delete-confirmation-modal";

type Photo = {
  id: string;
  filename: string;
  url: string;
  width?: number;
  height?: number;
  createdAt: string;
};

type GalleryPhotosListProps = {
  galleryId: string;
  photos: Photo[];
  onPhotosChanged?: () => void;
};

export function GalleryPhotosList({
  galleryId,
  photos,
  onPhotosChanged
}: GalleryPhotosListProps) {
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [deletingPhotoIds, setDeletingPhotoIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ photoId: string; filename: string } | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const handleSelectPhoto = (photoId: string) => {
    const newSet = new Set(selectedPhotoIds);
    if (newSet.has(photoId)) {
      newSet.delete(photoId);
    } else {
      newSet.add(photoId);
    }
    setSelectedPhotoIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedPhotoIds.size === photos.length) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(photos.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotoIds.size === 0) return;
    setConfirmBulkDelete(true);
  };

  const confirmBulkDeleteAction = async () => {
    setConfirmBulkDelete(false);
    setIsProcessing(true);
    setDeletingPhotoIds(new Set(selectedPhotoIds));

    try {
      const res = await fetch(
        `/api/admin/galleries/${galleryId}/photos/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            photoIds: Array.from(selectedPhotoIds)
          })
        }
      );

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message ?? "Failed to delete photos");
        return;
      }

      toast.success(
        result.failedCount > 0
          ? `Deleted ${result.deletedCount} photo(s), ${result.failedCount} Cloudinary error(s)`
          : `Deleted ${result.deletedCount} photo(s)`
      );

      setSelectedPhotoIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
      onPhotosChanged?.();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Failed to delete photos");
    } finally {
      setIsProcessing(false);
      setDeletingPhotoIds(new Set());
    }
  };

  const handleSingleDelete = async (photoId: string, filename: string) => {
    setConfirmDelete({ photoId, filename });
  };

  const confirmSingleDeleteAction = async () => {
    if (!confirmDelete) return;

    setDeletingPhotoIds(new Set([confirmDelete.photoId]));
    setConfirmDelete(null);

    try {
      const res = await fetch(
        `/api/admin/galleries/${galleryId}/photos/${confirmDelete.photoId}`,
        { method: "DELETE" }
      );

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message ?? "Failed to delete photo");
        return;
      }

      toast.success("Photo deleted successfully");
      await queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
      onPhotosChanged?.();
    } catch (error) {
      console.error("Delete photo error:", error);
      toast.error("Failed to delete photo");
    } finally {
      setDeletingPhotoIds(new Set());
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">No photos in this gallery</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modals */}
      {confirmDelete && (
        <DeleteConfirmationModal
          title="Delete Photo?"
          message={`Are you sure you want to delete "${confirmDelete.filename}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isDangerous={true}
          onConfirm={confirmSingleDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmBulkDelete && (
        <DeleteConfirmationModal
          title="Delete Multiple Photos?"
          message={`Are you sure you want to delete ${selectedPhotoIds.size} photo(s)? This action cannot be undone.`}
          confirmLabel="Delete All"
          cancelLabel="Cancel"
          isDangerous={true}
          onConfirm={confirmBulkDeleteAction}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}

      {/* Header dengan bulk actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Photos ({photos.length})
        </h3>
        {selectedPhotoIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">
              {selectedPhotoIds.size} selected
            </span>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {isProcessing ? "Deleting..." : "Delete Selected"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedPhotoIds(new Set())}
              disabled={isProcessing}
              className="rounded-full bg-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-400 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Select all checkbox */}
      {photos.length > 1 && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={selectedPhotoIds.size === photos.length && photos.length > 0}
            onChange={handleSelectAll}
            disabled={isProcessing}
            className="rounded border-slate-300"
          />
          <span className="text-slate-600">
            {selectedPhotoIds.size === photos.length ? "Deselect all" : "Select all"}
          </span>
        </label>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100"
          >
            {/* Checkbox */}
            <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <input
                type="checkbox"
                checked={selectedPhotoIds.has(photo.id)}
                onChange={() => handleSelectPhoto(photo.id)}
                disabled={isProcessing}
                className="rounded border-white h-5 w-5 cursor-pointer"
              />
            </div>

            {/* Photo */}
            <Image
              src={photo.url}
              alt={photo.filename}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized
            />

            {/* Delete button (hover overlay) */}
            {!selectedPhotoIds.has(photo.id) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleSingleDelete(photo.id, photo.filename)}
                  disabled={deletingPhotoIds.has(photo.id) || isProcessing}
                  className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  {deletingPhotoIds.has(photo.id) ? "Deleting..." : "Delete"}
                </button>
              </div>
            )}

            {/* Filename (on hover) */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-xs font-medium text-white">
                {photo.filename}
              </p>
              {photo.width && photo.height && (
                <p className="text-xs text-slate-300">
                  {photo.width}×{photo.height}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
