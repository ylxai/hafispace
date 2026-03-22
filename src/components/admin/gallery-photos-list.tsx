"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useToast } from "@/components/ui/toast";

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
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const handleDeletePhoto = async (photoId: string, filename: string) => {
    if (!window.confirm(`Delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(
        `/api/admin/galleries/${galleryId}/photos/${photoId}`,
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
      setDeletingPhotoId(null);
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
      <h3 className="text-sm font-semibold text-slate-900">
        Photos ({photos.length})
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100"
          >
            {/* Photo */}
            <Image
              src={photo.url}
              alt={photo.filename}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized
            />

            {/* Delete Button (overlay) */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo.id, photo.filename)}
                disabled={deletingPhotoId === photo.id}
                className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deletingPhotoId === photo.id ? "Deleting..." : "Delete"}
              </button>
            </div>

            {/* Filename (on hover) */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-xs font-medium text-white">
                {photo.filename}
              </p>
              <p className="text-xs text-slate-300">
                {photo.width && photo.height ? `${photo.width}×${photo.height}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
