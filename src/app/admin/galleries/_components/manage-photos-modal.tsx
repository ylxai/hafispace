"use client";

import { useState, useEffect } from "react";
import { GalleryPhotosList } from "@/components/admin/gallery-photos-list";
import { useToast } from "@/components/ui/toast";

type Photo = {
  id: string;
  filename: string;
  url: string;
  width?: number;
  height?: number;
  createdAt: string;
};

type ManagePhotosModalProps = {
  galleryId: string;
  onClose: () => void;
};

export function ManagePhotosModal({ galleryId, onClose }: ManagePhotosModalProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/admin/galleries/${galleryId}/photos`,
          { method: "GET" }
        );

        const result = await res.json();

        if (!res.ok) {
          setError(result.message ?? "Failed to load photos");
          toast.error(result.message ?? "Failed to load photos");
          return;
        }

        setPhotos(result.photos ?? []);
        setError(null);
      } catch (err) {
        console.error("Fetch photos error:", err);
        setError("Failed to load photos");
        toast.error("Failed to load photos");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, [galleryId, toast]);

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
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-4 text-center">
            <p className="text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Close
            </button>
          </div>
        ) : (
          <GalleryPhotosList
            galleryId={galleryId}
            photos={photos}
            onPhotosChanged={() => {
              // Refresh photos setelah delete
              // Refetch photos via state update;
            }}
          />
        )}
      </div>
    </div>
  );
}
