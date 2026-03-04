"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useEffect, useRef } from "react";
import { Lightbox } from "@/components/gallery/lightbox";
import type * as AblyModule from "ably";
import { WhatsappIcon } from "@/components/icons/whatsapp-icon";


type AblyRealtime = InstanceType<typeof AblyModule.Realtime>;

type Photo = {
  id: string;
  storageKey: string;
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
    viewCount: number;
    vendor: { 
      namaStudio: string | null; 
      logoUrl: string | null;
      phone?: string | null;
    };
    settings: {
      maxSelection: number;
      enableDownload: boolean;
      welcomeMessage: string | null;
      thankYouMessage: string | null;
      bannerClientName: string | null;
      bannerEventDate: string | null;
      bannerMessage: string | null;
    };
    photos: Photo[];
    selectionCount: number;
    selections: string[];
  };
};

function generateThumbnailUrl(cloudName: string, publicId: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto,h_400,q_auto:good,w_400/${publicId}`;
}

function extractCloudName(url: string): string {
  try {
    const match = url.match(/res\.cloudinary\.com\/([^/]+)\//);
    return match?.[1] ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
  } catch {
    return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
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

function PhotoCard({ photo, onClick, isSelected }: { photo: Photo; onClick: () => void; isSelected?: boolean }) {
  const cloudName = extractCloudName(photo.url);
  const publicId = extractPublicId(photo.url);
  const thumbnailUrl = generateThumbnailUrl(cloudName, publicId);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square overflow-hidden bg-slate-800 transition-all duration-200 hover:opacity-95"
    >
      <Image
        src={thumbnailUrl}
        alt={photo.filename}
        fill
        className="object-cover"
        sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = photo.url;
        }}
      />
      {isSelected && (
        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500">
          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
}

export default function ViewspacePage() {
  const params = useParams();
  const token = params.token as string;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "editing">("all");

  const { data, isLoading, isError, refetch } = useQuery<GalleryData>({
    queryKey: ["gallery", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/gallery/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Gallery not found");
      }
      return res.json();
    },
    retry: false,
  });

  const selectedPhotos = useMemo(() => {
    if (!data?.gallery?.photos || !data?.gallery?.selections) return [];
    return data.gallery.photos.filter(photo => 
      data.gallery.selections.includes(photo.storageKey)
    );
  }, [data?.gallery?.photos, data?.gallery?.selections]);

  // Debounce timer ref untuk Ably refetch — cegah multiple refetch saat banyak event sekaligus
  const refetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ably real-time subscription for selection updates
  useEffect(() => {
    if (!data?.gallery?.id) return;

    let ably: AblyRealtime | null = null;

    const connect = async () => {
      try {
        const Ably = (await import('ably')).default;
        // Pass gallery token to the API for authorization
        ably = new Ably.Realtime({ 
          authUrl: `/api/ably-token?gallery=${token}` 
        });
        const channel = ably.channels.get(`gallery:${data.gallery.id}:selection`);
        await channel.subscribe("count-updated", () => {
          // Debounce refetch — tunggu 500ms setelah event terakhir sebelum refetch
          if (refetchDebounceRef.current) {
            clearTimeout(refetchDebounceRef.current);
          }
          refetchDebounceRef.current = setTimeout(() => {
            refetch();
            refetchDebounceRef.current = null;
          }, 500);
        });
      } catch {
        // Ably connection failed — silent fallback
      }
    };

    connect();

    return () => {
      ably?.close();
      // Cleanup debounce timer saat unmount
      if (refetchDebounceRef.current) {
        clearTimeout(refetchDebounceRef.current);
      }
    };
  }, [data?.gallery?.id, token, refetch]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-slate-400" />
        <p className="text-sm text-slate-500">Loading gallery...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-white">Gallery not found</p>
          <p className="mt-2 text-sm text-slate-400">
            The gallery link may be invalid or not published yet.
          </p>
        </div>
      </div>
    );
  }

  const { gallery } = data;
  const hasPickspace = gallery.settings.maxSelection > 0;
  const hasDownload = gallery.settings.enableDownload;
  const isAllTab = activeTab === "all";

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleSubmitToWhatsApp = async () => {
    // Send notification to admin first
    try {
      await fetch(`/api/public/gallery/${token}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'selection_submitted',
          photoCount: selectedPhotos.length,
          photos: selectedPhotos.map(p => p.filename),
        }),
      });
    } catch (e) {
      console.error('Failed to send notification:', e);
    }

    // Open WhatsApp
    const phone = gallery.vendor.phone?.replace(/\D/g, '') ?? '';
    const message = `Hallo ${gallery.vendor.namaStudio ?? 'Admin'}, saya ingin submit ${selectedPhotos.length} foto dari gallery "${gallery.namaProject}":\n\n${selectedPhotos.map(p => `• ${p.filename}`).join('\n')}\n\nSilakan dicek ya, terima kasih!`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleDownloadOriginal = async () => {
    if (!hasDownload || selectedPhotos.length === 0) return;

    // Download each photo
    for (const photo of selectedPhotos) {
      const cloudName = extractCloudName(photo.url);
      const publicId = extractPublicId(photo.url);
      const downloadUrl = `https://res.cloudinary.com/${cloudName}/image/upload/fl_attachment/${publicId}`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = photo.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs uppercase tracking-wider text-slate-400">
              {gallery.vendor.namaStudio ?? "Photography"}
            </p>
            <h1 className="truncate text-base font-bold text-white sm:text-lg">
              {gallery.namaProject}
            </h1>
          </div>
          
          {hasPickspace && (
            <Link
              href={`/gallery/${token}/select`}
              className="ml-3 flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="hidden sm:inline">Select</span>
              {gallery.selectionCount > 0 && (
                <span className="ml-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white">
                  {gallery.selectionCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </header>

      {/* Welcome Banner */}
      {(gallery.settings.welcomeMessage ?? gallery.settings.bannerClientName) && (
        <div className="border-b border-white/5 bg-gradient-to-r from-slate-900 to-slate-800 py-6 text-center px-4">
          {gallery.settings.bannerClientName && (
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              {gallery.settings.bannerClientName}
            </p>
          )}
          {gallery.settings.welcomeMessage && (
            <p className="mt-1 text-lg font-light text-white sm:text-xl">
              {gallery.settings.welcomeMessage}
            </p>
          )}
          {gallery.settings.bannerEventDate && (
            <p className="mt-2 text-sm text-slate-400">{gallery.settings.bannerEventDate}</p>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="px-2 py-4 sm:px-4 sm:py-6">
        {/* Tabs */}
        {hasPickspace && (
          <div className="mb-4 flex gap-1 border-b border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "all"
                  ? "border-b-2 border-sky-500 text-sky-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Photos
              <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs">
                {gallery.photos.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("editing")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "editing"
                  ? "border-b-2 border-amber-500 text-amber-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Editing List
              <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs">
                {gallery.selectionCount}
              </span>
            </button>
          </div>
        )}

        {gallery.photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 py-16">
            <svg className="h-12 w-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-4 text-slate-500">No photos in this gallery yet.</p>
          </div>
        ) : isAllTab ? (
          /* All Photos - Grid */
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4 xl:grid-cols-5">
            {gallery.photos.map((photo, index) => {
              const isSelected = gallery.selections.includes(photo.storageKey);
              return (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  isSelected={isSelected}
                  onClick={() => openLightbox(index)}
                />
              );
            })}
          </div>
        ) : (
          /* Editing List Tab - List View */
          <div className="space-y-4">
            {selectedPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 py-16">
                <svg className="h-12 w-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <p className="mt-4 text-slate-500">No photos selected yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className="mt-4 text-sm text-sky-400 hover:text-sky-300"
                >
                  Browse all photos →
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400">
                  📝 Photos ready to submit for editing:
                </p>
                <div className="space-y-2">
                  {selectedPhotos.map((photo) => {
                    const cloudName = extractCloudName(photo.url);
                    const publicId = extractPublicId(photo.url);
                    const thumbnailUrl = generateThumbnailUrl(cloudName, publicId);
                    const originalIndex = gallery.photos.findIndex(p => p.id === photo.id);
                    
                    return (
                      <div
                        key={photo.id}
                        className="flex items-center gap-3 rounded-xl bg-slate-900/50 p-3 transition hover:bg-slate-900/70"
                      >
                        <button
                          type="button"
                          onClick={() => openLightbox(originalIndex >= 0 ? originalIndex : 0)}
                          className="shrink-0 overflow-hidden rounded-lg bg-slate-800"
                        >
                          <Image
                            src={thumbnailUrl}
                            alt={photo.filename}
                            width={56}
                            height={56}
                            className="h-14 w-14 object-cover"
                            unoptimized
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = photo.url;
                            }}
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {photo.filename}
                          </p>
                          {photo.width && photo.height && (
                            <p className="text-xs text-slate-500">
                              {photo.width} × {photo.height}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => openLightbox(originalIndex >= 0 ? originalIndex : 0)}
                          className="rounded-full p-2 text-slate-500 hover:bg-slate-800 hover:text-white"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Submit Section */}
                <div className="mt-6 space-y-4 rounded-2xl border border-amber-500/30 bg-amber-900/20 p-5">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">
                      🎯 {selectedPhotos.length} photos selected
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Submit your selection to start the editing process
                    </p>
                  </div>

                  <div className="flex gap-3">
                    {hasDownload && selectedPhotos.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDownloadOriginal}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Original
                      </button>
                    )}
                    
                    {gallery.vendor.phone ? (
                      <button
                        type="button"
                        onClick={handleSubmitToWhatsApp}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3 font-semibold text-white transition hover:bg-green-600"
                      >
                        <WhatsappIcon className="h-5 w-5" />
                        Submit
                      </button>
                    ) : (
                      <a
                        href={`mailto:${gallery.vendor.namaStudio}?subject=Photo Selection: ${gallery.namaProject}&body=${selectedPhotos.map(p => `${p.filename}`).join('\n')}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-600"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Submit
                      </a>
                    )}
                  </div>
                  
                  <p className="text-center text-xs text-slate-500">
                    {hasDownload 
                      ? "You can download originals or submit your selection to start editing"
                      : "Admin will review your selection and start the editing process"}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Lightbox */}
      <Lightbox
        photos={gallery.photos}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
