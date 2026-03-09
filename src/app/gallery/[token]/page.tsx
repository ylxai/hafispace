"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useEffect, useRef } from "react";
import { Lightbox } from "@/components/gallery/lightbox";
import type * as AblyModule from "ably";
import { WhatsappIcon } from "@/components/icons/whatsapp-icon";
import cloudinaryLoader from '@/lib/image-loader';
import { extractCloudName, extractPublicId, generateThumbnailUrl, generateDownloadUrl } from '@/lib/cloudinary/utils';


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

function PhotoCard({ photo, index, onClick, isSelected }: { photo: Photo; index: number; onClick: () => void; isSelected?: boolean }) {
  const cloudName = extractCloudName(photo.url);
  const publicId = extractPublicId(photo.url);
  const thumbnailUrl = generateThumbnailUrl(cloudName, publicId);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Lihat foto ${index + 1}`}
      className="group relative aspect-square overflow-hidden bg-slate-800 transition-all duration-200 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-slate-950"
    >
      <Image
        src={thumbnailUrl}
        alt={`Foto ${index + 1}`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = photo.url;
        }}
      />
      {isSelected && (
        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 shadow-md">
          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      {/* Nomor foto — muncul saat hover */}
      <div className="absolute bottom-1.5 left-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/80 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {index + 1}
      </div>
    </button>
  );
}

export default function ViewspacePage() {
  const params = useParams();
  const token = params.token as string;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "editing">("all");
  const [bannerOpen, setBannerOpen] = useState(true);
  const [copied, setCopied] = useState(false);

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

  // Debounce timer ref untuk Ably refetch
  const refetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ably real-time subscription for selection updates
  useEffect(() => {
    if (!data?.gallery?.id) return;

    let ably: AblyRealtime | null = null;

    const connect = async () => {
      try {
        const Ably = (await import('ably')).default;
        ably = new Ably.Realtime({ 
          authUrl: `/api/ably-token?gallery=${token}` 
        });
        const channel = ably.channels.get(`gallery:${data.gallery.id}:selection`);
        await channel.subscribe("count-updated", () => {
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
      if (refetchDebounceRef.current) {
        clearTimeout(refetchDebounceRef.current);
      }
    };
  }, [data?.gallery?.id, token, refetch]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-slate-400" />
        <p className="text-sm text-slate-500">Memuat galeri...</p>
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
          <p className="text-lg font-semibold text-white">Galeri tidak ditemukan</p>
          <p className="mt-2 text-sm text-slate-400">
            Link galeri tidak valid atau belum dipublikasikan.
          </p>
        </div>
      </div>
    );
  }

  const { gallery } = data;
  const hasPickspace = gallery.settings.maxSelection > 0;
  const hasDownload = gallery.settings.enableDownload;
  const isAllTab = activeTab === "all";
  const hasBanner = !!(gallery.settings.welcomeMessage ?? gallery.settings.bannerClientName);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleSubmitToWhatsApp = async () => {
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

    const phone = gallery.vendor.phone?.replace(/\D/g, '') ?? '';
    // Kirim pesan ringkasan — bukan daftar filename (mencegah URL terpotong jika foto banyak)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const adminLink = `${appUrl}/admin/galleries`;
    const message = `Halo ${gallery.vendor.namaStudio ?? 'Admin'}, saya telah memilih *${selectedPhotos.length} foto* dari galeri *"${gallery.namaProject}"*.\n\nSilakan cek seleksi saya di panel admin:\n${adminLink}\n\nTerima kasih! 🙏`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleDownloadOriginal = async () => {
    if (!hasDownload || selectedPhotos.length === 0) return;

    for (const photo of selectedPhotos) {
      // generateDownloadUrl validasi URL — return "" jika bukan Cloudinary URL (XSS prevention)
      const downloadUrl = generateDownloadUrl(photo.url);
      if (!downloadUrl) continue; // skip foto dengan URL tidak valid

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = photo.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            {/* Studio name — elegant serif-inspired, semua lowercase dengan tracking */}
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.25em] text-slate-400">
              {gallery.vendor.namaStudio ?? "Photography"}
            </p>
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-bold text-white sm:text-lg">
                {gallery.namaProject}
              </h1>
              {/* Jumlah foto */}
              <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                {gallery.photos.length} foto
              </span>
            </div>
          </div>

          <div className="ml-3 flex shrink-0 items-center gap-2">
            {/* Share / Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              title={copied ? "Link disalin!" : "Salin link galeri"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            >
              {copied ? (
                <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>

            {hasPickspace && (
              <Link
                href={`/gallery/${token}/select`}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden sm:inline">Pilih Foto</span>
                {gallery.selectionCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white">
                    {gallery.selectionCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Welcome Banner — collapsible */}
      {hasBanner && (
        <div className="border-b border-white/5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="flex items-start justify-between px-4 py-4">
            <div className="flex-1 text-center">
              {gallery.settings.bannerClientName && (
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-rose-300/80">
                  {gallery.settings.bannerClientName}
                </p>
              )}
              {bannerOpen && (
                <>
                  {gallery.settings.welcomeMessage && (
                    <p className="mt-1 text-sm font-light text-white/90 sm:text-base">
                      {gallery.settings.welcomeMessage}
                    </p>
                  )}
                  {gallery.settings.bannerEventDate && (
                    <p className="mt-1.5 text-xs text-slate-400">{gallery.settings.bannerEventDate}</p>
                  )}
                </>
              )}
            </div>
            {/* Toggle collapse banner */}
            <button
              type="button"
              onClick={() => setBannerOpen(o => !o)}
              className="ml-2 shrink-0 rounded-full p-1 text-slate-500 transition hover:text-slate-300"
              aria-label={bannerOpen ? "Sembunyikan pesan" : "Tampilkan pesan"}
            >
              <svg className={`h-4 w-4 transition-transform duration-200 ${bannerOpen ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-1 py-3 sm:px-3 sm:py-5">
        {/* Tabs */}
        {hasPickspace && (
          <div className="mb-3 flex gap-1 border-b border-white/10 px-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "all"
                  ? "border-b-2 border-sky-500 text-sky-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Semua Foto
              <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs">
                {gallery.photos.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("editing")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "editing"
                  ? "border-b-2 border-rose-400 text-rose-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Foto Pilihan Saya
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
            <p className="mt-4 text-slate-500">Belum ada foto di galeri ini.</p>
          </div>
        ) : isAllTab ? (
          /* All Photos - Grid */
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-1.5 lg:grid-cols-4">
            {gallery.photos.map((photo, index) => {
              const isSelected = gallery.selections.includes(photo.storageKey);
              return (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  isSelected={isSelected}
                  onClick={() => openLightbox(index)}
                />
              );
            })}
          </div>
        ) : (
          /* Tab: Foto Pilihan Saya */
          <div className="space-y-4 px-2">
            {selectedPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 py-16">
                <svg className="h-12 w-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <p className="mt-4 text-slate-500">Belum ada foto yang dipilih.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className="mt-4 text-sm text-sky-400 hover:text-sky-300"
                >
                  Lihat semua foto →
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400">
                  📝 {selectedPhotos.length} foto siap diproses:
                </p>
                <div className="space-y-2">
                  {selectedPhotos.map((photo, idx) => {
                    const cloudName = extractCloudName(photo.url);
                    const publicId = extractPublicId(photo.url);
                    const thumbnailUrl = generateThumbnailUrl(cloudName, publicId);
                    const originalIndex = gallery.photos.findIndex(p => p.id === photo.id);
                    
                    return (
                      <div
                        key={photo.id}
                        className="flex items-center gap-3 rounded-xl bg-slate-900/50 p-3 transition hover:bg-slate-900/70"
                      >
                        <span className="w-5 shrink-0 text-center text-xs text-slate-600 font-medium">{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => openLightbox(originalIndex >= 0 ? originalIndex : 0)}
                          className="shrink-0 overflow-hidden rounded-lg bg-slate-800"
                        >
                          <Image
                            src={thumbnailUrl}
                            alt={`Foto pilihan ${idx + 1}`}
                            width={56}
                            height={56}
                            className="h-14 w-14 object-cover"
                            loader={cloudinaryLoader}
                            quality={75}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = photo.url;
                            }}
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            Foto {originalIndex + 1}
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
                          aria-label="Lihat foto"
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
                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-900/10 p-4">
                  <p className="mb-3 text-center text-sm text-slate-400">
                    🎯 {selectedPhotos.length} foto siap — kirim untuk mulai editing
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {hasDownload && selectedPhotos.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDownloadOriginal}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Unduh Original
                      </button>
                    )}
                    {gallery.vendor.phone ? (
                      <button
                        type="button"
                        onClick={handleSubmitToWhatsApp}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600"
                      >
                        <WhatsappIcon className="h-4 w-4" />
                        Kirim via WhatsApp
                      </button>
                    ) : (
                      <a
                        href={`mailto:${gallery.vendor.namaStudio}?subject=Seleksi Foto: ${gallery.namaProject}&body=${selectedPhotos.map((_, i) => `Foto ${i + 1}`).join('\n')}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Kirim via Email
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer credit studio */}
        <div className="mt-10 pb-6 text-center">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} {gallery.vendor.namaStudio ?? "Photography"} · Galeri foto eksklusif
          </p>
        </div>
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
