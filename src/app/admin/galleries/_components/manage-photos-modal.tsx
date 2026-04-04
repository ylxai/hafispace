"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { GalleryPhotosList } from "@/components/admin/gallery-photos-list";
import { useToast } from "@/components/ui/toast";
import type { ApiPhoto } from "@/types/gallery";
type Photo = ApiPhoto; // Single source of truth

type ManagePhotosModalProps = {
  galleryId: string;
  onClose: () => void;
};

async function fetchGalleryPhotos(galleryId: string): Promise<Photo[]> {
  const res = await fetch(`/api/admin/galleries/${galleryId}/photos`);
  const result = await res.json();
  if (!res.ok) throw new Error(result.message ?? "Failed to load photos");
  return result.photos ?? [];
}

export function ManagePhotosModal({ galleryId, onClose }: ManagePhotosModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: photos = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["gallery-photos", galleryId],
    queryFn: () => fetchGalleryPhotos(galleryId),
    staleTime: 0, // Always fresh — photos bisa berubah kapan saja
    gcTime: 0,    // Jangan cache — modal bisa dibuka lagi dengan data berbeda
  });

  // Show toast saat error — di dalam useEffect agar tidak trigger di render phase
  useEffect(() => {
    if (isError && error instanceof Error) {
      toast.error(error.message);
    }
  }, [isError, error, toast]);

  const handlePhotosChanged = () => {
    void queryClient.invalidateQueries({ queryKey: ["gallery-photos", galleryId] });
    void queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Manage Photos</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-500 mx-auto" />
              <p className="text-sm text-slate-600">Loading photos...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="rounded-xl bg-red-50 p-4 text-center">
            <p className="text-sm text-red-800">
              {error instanceof Error ? error.message : "Failed to load photos"}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <GalleryPhotosList
            galleryId={galleryId}
            photos={photos}
            onPhotosChanged={handlePhotosChanged}
          />
        )}
      </div>
    </div>
  );
}
