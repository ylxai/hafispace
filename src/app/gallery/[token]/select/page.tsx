"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Ably from "ably";
import cloudinaryLoader from "@/lib/image-loader";
import { extractCloudName, extractPublicId, generateThumbnailUrl } from "@/lib/cloudinary/utils";

type Photo = {
  id: string;
  // storageKey dihapus dari public API response (security) — pakai id sebagai fileId
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


function PhotoSelectCard({
  photo,
  index,
  isSelected,
  isFull,
  isLocked,
  onToggle,
  isPending,
}: {
  photo: Photo;
  index: number;
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
      aria-label={`${isSelected ? "Batalkan pilihan" : "Pilih"} foto ${index + 1}`}
      className={`group relative aspect-square w-full overflow-hidden rounded-xl transition-all duration-200 ${
        isSelected
          ? "ring-4 ring-[var(--rose-gold)] ring-offset-2"
          : canSelect
            ? "hover:shadow-lg"
            : "cursor-not-allowed opacity-40"
      }`}
      style={{ boxShadow: 'var(--glass-shadow-md)' }}
    >
      <div className="relative h-full w-full">
        <Image
          src={thumbnailUrl}
          alt={`Foto ${index + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          loading="lazy"
          loader={cloudinaryLoader}
          quality={80}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = photo.url;
          }}
        />
      </div>

      {/* Nomor foto */}
      <div className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'rgba(255,255,255,0.8)', color: 'var(--charcoal)' }}>
        {index + 1}
      </div>

      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(183, 110, 121, 0.2)' }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full shadow-lg" style={{ background: 'var(--rose-gold)' }}>
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Pending overlay */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.6)' }}>
          <div className="h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'var(--champagne)', borderTopColor: 'var(--rose-gold)' }} />
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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const { data, isLoading, isError } = useQuery<GalleryData>({
    queryKey: ["gallery", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/gallery/${token}`);
      if (!res.ok) throw new Error("Gallery not found");
      return res.json();
    },
    retry: false,
  });

  // FIX Bug 6,12: Reset all state when token changes
  useEffect(() => {
    setSelectedIds(new Set());
    setPendingId(null);
    setIsLocked(false);
    setShowSuccess(false);
    setShowHint(true);
  }, [token]);

  // Initialize selections from server - ONLY on initial load or when data is stale
  // Don't override if there are pending operations OR bulk processing
  // Gunakan ref untuk track apakah initial load sudah dilakukan
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!data?.gallery) return;
    if (pendingId || isBulkProcessing) return;
    // Selalu sync dari server — tapi hanya pakai photo.id yang ada di photos list
    // (bukan fileId lama yang mungkin pakai storageKey)
    const photoIds = new Set(data.gallery.photos.map((p: Photo) => p.id));
    const validSelections = (data.gallery.selections as string[]).filter(
      (id) => photoIds.has(id)
    );
    setSelectedIds(new Set(validSelections));
    initializedRef.current = true;
  }, [data, pendingId, isBulkProcessing]);

  // FIX Bug 1: Reset showHint when all selections are cleared
  useEffect(() => {
    if (selectedIds.size === 0) {
      setShowHint(true);
    } else if (selectedIds.size > 0) {
      setShowHint(false);
    }
  }, [selectedIds.size]);

  // FIX Bug 7: Simplified Ably subscription - no auto refresh to avoid race conditions
  useEffect(() => {
    if (!data?.gallery?.id) return;

    let ably: Ably.Realtime | null = null;

    const connect = async () => {
      try {
        ably = new Ably.Realtime({ 
          authUrl: `/api/ably-token?gallery=${token}` 
        });
        const channel = ably.channels.get(`gallery:${data.gallery.id}:selection`);
        await channel.subscribe("count-updated", () => {
          // Only refresh if no local pending operations
          if (!pendingId && !isBulkProcessing) {
            queryClient.invalidateQueries({ queryKey: ["gallery", token] });
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
  }, [data?.gallery?.id, token, queryClient, pendingId, isBulkProcessing]);

  // Debounce ref: antrian pending action per photo id
  // Mencegah spam click → Ably quota exceeded (free tier: 6 msg/s)
  const debounceTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // FIX Bug 2: Helper function to clear all debounce timers
  const clearAllDebounceTimers = useCallback(() => {
    debounceTimerRef.current.forEach((timer) => clearTimeout(timer));
    debounceTimerRef.current.clear();
    setPendingId(null); // Cancel any pending mutation
  }, []);

  // Cleanup semua debounce timer saat komponen unmount atau token berubah
  useEffect(() => {
    return () => {
      debounceTimerRef.current.forEach((timer) => clearTimeout(timer));
      debounceTimerRef.current.clear();
    };
  }, [token]);

  const handleToggle = useCallback(
    (photo: Photo) => {
      if (isLocked) return;
      
      // Only one pending mutation at a time - ignore clicks while processing
      if (pendingId) return;
      
      const action = selectedIds.has(photo.id) ? "remove" : "add";

      // Optimistic UI: langsung update state lokal agar UI responsif
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (action === "add") next.add(photo.id);
        else next.delete(photo.id);
        return next;
      });

      // Set pending immediately to prevent race conditions
      setPendingId(photo.id);

      // Debounce API call 400ms — prevents spam clicks
      const timer = setTimeout(async () => {
        debounceTimerRef.current.delete(photo.id);
        
        // Double-check we still have a valid state before calling API
        if (isLocked) {
          setPendingId(null);
          return;
        }
        
        try {
          const res = await fetch(`/api/public/gallery/${token}/select`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileId: photo.id,
              filename: photo.filename,
              url: photo.url,
              action,
            }),
          });
          
          if (!res.ok) {
            const err = await res.json();
            // On error, revert optimistic update
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (action === "add") next.delete(photo.id);
              else next.add(photo.id);
              return next;
            });
            alert(err.message ?? "Gagal memperbarui pilihan");
          } else {
            // Success - invalidate to sync with server
            await queryClient.invalidateQueries({ queryKey: ["gallery", token] });
          }
        } catch {
          // On error, revert optimistic update
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (action === "add") next.delete(photo.id);
            else next.add(photo.id);
            return next;
          });
          alert("Terjadi kesalahan koneksi");
        } finally {
          setPendingId(null);
        }
      }, 400);

      debounceTimerRef.current.set(photo.id, timer);
    },
    [isLocked, selectedIds, token, queryClient, pendingId]
  );

  const handleSelectAll = useCallback(async () => {
    if (!data?.gallery || isBulkProcessing || pendingId) return;
    
    // FIX Bug 2: Clear all debounce timers before bulk operation
    clearAllDebounceTimers();

    // pendingId sudah dijamin null karena guard di awal fungsi: if (pendingId) return
    
    setIsBulkProcessing(true);
    try {
      // FIX Bug 4,11: Limit selection to maxSelection
      const maxSel = data.gallery.settings.maxSelection;
      const photosToSelect = data.gallery.photos.slice(0, maxSel);
      const res = await fetch(`/api/public/gallery/${token}/select/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-all",
          photos: photosToSelect.map((p) => ({
            fileId: p.id,
            filename: p.filename,
            url: p.url,
          })),
        }),
      });
      if (!res.ok) throw new Error("Gagal memilih semua foto");
      // Update selectedIds - only up to maxSelection
      const allKeys = new Set(photosToSelect.map((p) => p.id));
      setSelectedIds(allKeys);
      await queryClient.invalidateQueries({ queryKey: ["gallery", token] });
    } catch {
      alert("Gagal memilih semua foto. Coba lagi.");
    } finally {
      setIsBulkProcessing(false);
    }
  }, [data, token, isBulkProcessing, pendingId, queryClient, clearAllDebounceTimers]);

  const handleClearAll = useCallback(async () => {
    if (!data?.gallery || isBulkProcessing || pendingId) return;
    
    // FIX Bug 2: Clear all debounce timers before bulk operation
    clearAllDebounceTimers();

    // pendingId sudah dijamin null karena guard di awal fungsi: if (pendingId) return
    
    setIsBulkProcessing(true);
    try {
      const res = await fetch(`/api/public/gallery/${token}/select/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-all" }),
      });
      if (!res.ok) throw new Error("Gagal membatalkan semua pilihan");
      // Set selectedIds ke empty SEBELUM invalidate agar useEffect tidak override
      setSelectedIds(new Set());
      setShowHint(true);
      // Set isBulkProcessing false SEBELUM invalidate — useEffect akan skip karena selectedIds sudah 0
      setIsBulkProcessing(false);
      await queryClient.invalidateQueries({ queryKey: ["gallery", token] });
    } catch {
      alert("Gagal membatalkan semua pilihan. Coba lagi.");
      setIsBulkProcessing(false);
    }
  }, [data, token, isBulkProcessing, pendingId, queryClient, clearAllDebounceTimers]);

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch(`/api/public/gallery/${token}/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Gagal mengirim seleksi. Coba lagi.");
        return;
      }
      setIsLocked(true);
      setShowSuccess(true);
    } catch {
      alert("Terjadi kesalahan. Periksa koneksi internet Anda.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="glass-card p-8 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--antique-gold)] border-t-transparent rounded-full animate-spin" />
          <p style={{ color: 'var(--warm-gray)' }}>Memuat galeri...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--champagne)] flex items-center justify-center">
            <svg className="w-8 h-8" style={{ color: 'var(--warm-gray)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-lg font-semibold" style={{ color: 'var(--charcoal)' }}>Galeri tidak ditemukan</p>
          <p style={{ color: 'var(--warm-gray)' }}>
            Link galeri tidak valid atau sudah kadaluarsa.
          </p>
        </div>
      </div>
    );
  }

  const { gallery } = data;
  const maxSelection = gallery.settings.maxSelection;
  // FIX Bug 3,9: Use selectedIds.size consistently for isFull
  const isFull = selectedIds.size >= maxSelection;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, var(--pearl-white) 0%, var(--soft-cream) 50%, var(--champagne) 100%)' }}>
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'rgba(254, 252, 249, 0.8)' }}>
          <div className="glass-card w-full max-w-sm p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(212, 175, 55, 0.15)' }}>
              <svg className="h-8 w-8" style={{ color: 'var(--antique-gold)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--charcoal)' }}>Pilihan Berhasil Dikirim!</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--warm-gray)' }}>
              Anda telah memilih <strong>{selectedIds.size} foto</strong>. Fotografer akan segera memproses pilihan Anda.
            </p>
            {gallery.settings.thankYouMessage && (
              <p className="mt-4 rounded-xl p-3 text-sm italic" style={{ background: 'var(--champagne)', color: 'var(--warm-gray)' }}>
                &ldquo;{gallery.settings.thankYouMessage}&rdquo;
              </p>
            )}
            <Link
              href={`/gallery/${token}`}
              className="glass-btn-primary mt-6 inline-block w-full px-8 py-3 text-sm font-semibold"
            >
              Kembali ke Galeri
            </Link>
          </div>
        </div>
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 glass backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Link
                href={`/gallery/${token}`}
                className="mb-1 flex items-center gap-1.5 text-xs font-medium transition-colors hover:underline"
                style={{ color: 'var(--warm-gray)' }}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke galeri
              </Link>
            </div>
            {/* Tombol submit header */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || isLocked}
              className="glass-btn-primary shrink-0 px-5 py-2.5 text-sm font-semibold"
            >
              Kirim Seleksi ({selectedIds.size})
            </button>
          </div>
          {/* Counter tunggal di bawah header */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(212, 175, 55, 0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min((selectedIds.size / maxSelection) * 100, 100)}%`,
                  background: isLocked ? '#22c55e' : isFull ? 'var(--rose-gold)' : 'var(--antique-gold)'
                }}
              />
            </div>
            <span className="text-xs shrink-0" style={{ color: 'var(--warm-gray)' }}>
              {selectedIds.size} / {maxSelection} dipilih
            </span>
          </div>
        </div>
      </header>

      {/* Instructions + Quick Actions */}
      <div className="glass mx-4 mt-4 rounded-xl px-4 py-2.5 sm:px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-3 flex-wrap">
          {/* Hint — tampil hanya jika belum ada yang dipilih */}
          {showHint ? (
            <p className="text-sm flex-1" style={{ color: 'var(--warm-gray)' }}>
              Ketuk foto untuk memilih · Maks. <strong>{maxSelection}</strong> foto
              {isFull && !isLocked && (
                <span className="ml-2 font-semibold" style={{ color: 'var(--rose-gold)' }}>· Kuota penuh</span>
              )}
            </p>
          ) : (
            <p className="text-sm flex-1" style={{ color: 'var(--warm-gray)' }}>
              {selectedIds.size} foto dipilih · Maks. <strong>{maxSelection}</strong>
              {isFull && !isLocked && (
                <span className="ml-2 font-semibold" style={{ color: 'var(--rose-gold)' }}>· Kuota penuh</span>
              )}
            </p>
          )}
          {/* Quick action buttons */}
          {!isLocked && (
            <div className="flex items-center gap-2 shrink-0">
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={!!pendingId || isBulkProcessing}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-white/50 disabled:opacity-50"
                  style={{ borderColor: 'var(--rose-gold)', color: 'var(--rose-gold)' }}
                >
                  {isBulkProcessing ? "..." : "Batal Semua"}
                </button>
              )}
              {selectedIds.size === 0 && gallery.photos.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={!!pendingId || isFull || isBulkProcessing}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-white/50 disabled:opacity-50"
                  style={{ borderColor: 'var(--antique-gold)', color: 'var(--antique-gold)' }}
                >
                  {isBulkProcessing ? "..." : "Pilih Semua"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo Grid */}
      <main className="mx-auto max-w-5xl px-3 py-5 sm:px-6">
        {gallery.photos.length === 0 ? (
          <div className="glass-card mx-4 py-20 text-center">
            <p style={{ color: 'var(--warm-gray)' }}>Belum ada foto di galeri ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.photos.map((photo, index) => (
              <PhotoSelectCard
                key={photo.id}
                photo={photo}
                index={index}
                isSelected={selectedIds.has(photo.id)}
                isFull={isFull}
                isLocked={isLocked}
                onToggle={handleToggle}
                isPending={pendingId === photo.id}
              />
            ))}
          </div>
        )}

        {/* Footer credit studio */}
        <div className="mt-10 pb-6 text-center">
          <p className="text-xs" style={{ color: 'var(--light-gray)' }}>
            © {new Date().getFullYear()} {gallery.vendor.namaStudio ?? "Photography"}
          </p>
        </div>
      </main>
    </div>
  );
}
