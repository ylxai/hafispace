"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Ably from "ably";

function generateThumbnailUrl(cloudName: string, publicId: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto,h_400,q_auto:good,w_400/${publicId}`;
}

function extractCloudName(url: string): string {
  try {
    const match = url.match(/res\.cloudinary\.com\/([^/]+)\//);
    return match?.[1] ?? 'doweertbx';
  } catch {
    return 'doweertbx';
  }
}

function extractPublicId(url: string): string {
  try {
    const match = url.match(/\/upload\/(.+)$/);
    return match?.[1] ?? '';
  } catch {
    return '';
  }
}

type Photo = {
  id: string;
  storageKey: string;  // Fixed: Changed from fileId to storageKey to match API response
  filename: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  urutan: number;
};

type GalleryData = {
  gallery: {
    id: string;
    namaProject: string;
    status: string;
    clientToken: string;
    vendor: { namaStudio: string | null };
    settings: {
      maxSelection: number;
      enableDownload: boolean;
      welcomeMessage: string | null;
      thankYouMessage: string | null;
    };
    photos: Photo[];
    selectionCount: number;
    selections: string[];
  };
};

function SelectionCounter({
  count,
  max,
  isLocked,
}: {
  count: number;
  max: number;
  isLocked: boolean;
}) {
  const pct = Math.min((count / max) * 100, 100);
  const isFull = count >= max;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className={`font-semibold ${isFull ? "text-amber-600" : "text-slate-900"}`}>
          {count} / {max} selected
        </span>
        {isLocked && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            ✓ Submitted
          </span>
        )}
        {isFull && !isLocked && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            Quota full
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isFull ? "bg-amber-500" : "bg-slate-900"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PhotoSelectCard({
  photo,
  isSelected,
  isFull,
  isLocked,
  onToggle,
  isPending,
}: {
  photo: Photo;
  isSelected: boolean;
  isFull: boolean;
  isLocked: boolean;
  onToggle: (photo: Photo) => void;
  isPending: boolean;
}) {
  const canSelect = isSelected || (!isFull && !isLocked);
  
  const cloudName = extractCloudName(photo.url);
  const publicId = extractPublicId(photo.url);
  const thumbnailUrl = generateThumbnailUrl(cloudName, publicId);

  return (
    <button
      type="button"
      onClick={() => canSelect && onToggle(photo)}
      disabled={!canSelect || isPending}
      className={`group relative aspect-square w-full overflow-hidden rounded-xl transition-all duration-200 ${
        isSelected
          ? "ring-4 ring-slate-900 ring-offset-2"
          : canSelect
            ? "hover:opacity-90"
            : "cursor-not-allowed opacity-50"
      }`}
      aria-label={`${isSelected ? "Deselect" : "Select"} ${photo.filename}`}
    >
      <div className="relative h-full w-full bg-slate-100">
        <Image
          src={thumbnailUrl}
          alt={photo.filename}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          loading="lazy"
          unoptimized
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = photo.url;
          }}
        />
      </div>

      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Pending overlay */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        </div>
      )}
    </button>
  );
}

export default function PickspacePage() {
  const params = useParams();
  const token = params.token as string;
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionCount, setSelectionCount] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data, isLoading, isError } = useQuery<GalleryData>({
    queryKey: ["gallery", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/gallery/${token}`);
      if (!res.ok) throw new Error("Gallery not found");
      return res.json();
    },
    retry: false,
  });

  // Initialize selections from server
  useEffect(() => {
    if (data?.gallery) {
      const ids = new Set(data.gallery.selections);
      setSelectedIds(ids);
      setSelectionCount(data.gallery.selectionCount);
    }
  }, [data]);

  // Ably real-time subscription
  useEffect(() => {
    if (!data?.gallery?.id) return;

    let ably: Ably.Realtime | null = null;

    const connect = async () => {
      try {
        // Pass gallery token to the API for authorization
        ably = new Ably.Realtime({ 
          authUrl: `/api/ably-token?gallery=${token}` 
        });
        const channel = ably.channels.get(`gallery:${data.gallery.id}:selection`);
        await channel.subscribe("count-updated", (msg) => {
          if (typeof msg.data?.count === "number") {
            setSelectionCount(msg.data.count);
          }
        });
      } catch {
        // Ably connection failed — silent fallback
      }
    };

    connect();

    return () => {
      ably?.close();
    };
  }, [data?.gallery?.id, token]);

  const { mutate: toggleSelection } = useMutation({
    mutationFn: async ({ photo, action }: { photo: Photo; action: "add" | "remove" }) => {
      const res = await fetch(`/api/public/gallery/${token}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: photo.storageKey,  // Fixed: Use storageKey as fileId
          filename: photo.filename,
          url: photo.url,
          action,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to update selection");
      }
      return res.json();
    },
    onSuccess: (result, { photo, action }) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (action === "add") next.add(photo.storageKey);
        else next.delete(photo.storageKey);
        return next;
      });
      setSelectionCount(result.selectionCount);
      queryClient.invalidateQueries({ queryKey: ["gallery", token] });
    },
    onSettled: () => setPendingId(null),
    onError: (err) => {
      alert(err instanceof Error ? err.message : "Failed to update selection");
    },
  });

  const handleToggle = useCallback(
    (photo: Photo) => {
      if (isLocked || pendingId) return;
      const action = selectedIds.has(photo.storageKey) ? "remove" : "add";
      setPendingId(photo.storageKey);
      toggleSelection({ photo, action });
    },
    [isLocked, pendingId, selectedIds, toggleSelection]
  );

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setIsLocked(true);
    setShowSuccess(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="text-sm text-slate-500">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">Gallery not found</p>
          <p className="mt-2 text-sm text-slate-500">The gallery link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const { gallery } = data;
  const maxSelection = gallery.settings.maxSelection;
  const isFull = selectionCount >= maxSelection;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Selection Submitted!</h2>
            <p className="mt-2 text-sm text-slate-600">
              You have selected {selectedIds.size} photos. Your photographer has been notified.
            </p>
            {gallery.settings.thankYouMessage && (
              <p className="mt-4 text-sm italic text-slate-500">{gallery.settings.thankYouMessage}</p>
            )}
            <Link
              href={`/gallery/${token}`}
              className="mt-6 inline-block rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              View Gallery
            </Link>
          </div>
        </div>
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Link
                href={`/gallery/${token}`}
                className="mb-1 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                ← Back to gallery
              </Link>
              <h1 className="truncate text-base font-bold text-slate-900">{gallery.namaProject}</h1>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || isLocked}
              className="shrink-0 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              Submit ({selectedIds.size})
            </button>
          </div>
          <div className="mt-3">
            <SelectionCounter count={selectionCount} max={maxSelection} isLocked={isLocked} />
          </div>
        </div>
      </header>

      {/* Instructions */}
      <div className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
        <p className="text-center text-sm text-slate-600">
          Tap a photo to select it · Choose up to <strong>{maxSelection}</strong> photos
          {isFull && !isLocked && (
            <span className="ml-2 font-semibold text-amber-600">· Quota reached</span>
          )}
        </p>
      </div>

      {/* Photo Grid */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {gallery.photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <p className="text-slate-500">No photos in this gallery yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {gallery.photos.map((photo) => (
              <PhotoSelectCard
                key={photo.id}
                photo={photo}
                isSelected={selectedIds.has(photo.storageKey)}
                isFull={isFull}
                isLocked={isLocked}
                onToggle={handleToggle}
                isPending={pendingId === photo.storageKey}
              />
            ))}
          </div>
        )}

        {/* Bottom Submit */}
        {gallery.photos.length > 0 && !isLocked && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.size === 0}
              className="rounded-full bg-slate-900 px-10 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              Submit Selection ({selectedIds.size} photos)
            </button>
            {selectedIds.size === 0 && (
              <p className="mt-2 text-xs text-slate-500">Select at least 1 photo to submit</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
