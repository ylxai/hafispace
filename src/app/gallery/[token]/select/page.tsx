"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Ably from "ably";
import cloudinaryLoader from "@/lib/image-loader";
import { extractCloudName, extractPublicId, generateThumbnailUrl } from "@/lib/cloudinary/utils";

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
          ? "ring-4 ring-slate-900 ring-offset-2"
          : canSelect
            ? "hover:opacity-90 active:scale-95"
            : "cursor-not-allowed opacity-40"
      }`}
    >
      <div className="relative h-full w-full bg-slate-100">
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
      <div className="absolute bottom-1.5 left-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
        {index + 1}
      </div>

      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
  const [showHint, setShowHint] = useState(true);

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

  // Sembunyikan hint setelah interaksi pertama
  useEffect(() => {
    if (selectedIds.size > 0) setShowHint(false);
  }, [selectedIds.size]);

  // Ably real-time subscription
  useEffect(() => {
    if (!data?.gallery?.id) return;

    let ably: Ably.Realtime | null = null;

    const connect = async () => {
      try {
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

  // Debounce ref: antrian pending action per photo storageKey
  // Mencegah spam click → Ably quota exceeded (free tier: 6 msg/s)
  const debounceTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup semua debounce timer saat komponen unmount
  useEffect(() => {
    const timers = debounceTimerRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const { mutate: toggleSelection } = useMutation({
    mutationFn: async ({ photo, action }: { photo: Photo; action: "add" | "remove" }) => {
      const res = await fetch(`/api/public/gallery/${token}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: photo.storageKey,
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
    onError: (err, { photo, action }) => {
      // Revert optimistic update jika API gagal — kembalikan state ke kondisi sebelumnya
      setSelectedIds((prev) => {
        const next = new Set(prev);
        // Balik aksi: jika tadi "add" yang gagal → hapus; jika "remove" yang gagal → tambah kembali
        if (action === "add") next.delete(photo.storageKey);
        else next.add(photo.storageKey);
        return next;
      });
      alert(err instanceof Error ? err.message : "Gagal memperbarui pilihan");
    },
  });

  const handleToggle = useCallback(
    (photo: Photo) => {
      // Hapus || pendingId dari guard — setiap foto punya tombol disabled sendiri
      // Global lock hanya untuk isLocked (seleksi sudah dikirim)
      if (isLocked) return;
      const action = selectedIds.has(photo.storageKey) ? "remove" : "add";

      // Optimistic UI: langsung update state lokal agar UI responsif
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (action === "add") next.add(photo.storageKey);
        else next.delete(photo.storageKey);
        return next;
      });

      // Debounce API call 400ms — mencegah spam click menghabiskan Ably quota
      // Jika user klik berkali-kali dalam 400ms, hanya request terakhir yang dikirim
      const existing = debounceTimerRef.current.get(photo.storageKey);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        debounceTimerRef.current.delete(photo.storageKey);
        setPendingId(photo.storageKey);
        toggleSelection({ photo, action });
      }, 400);

      debounceTimerRef.current.set(photo.storageKey, timer);
    },
    [isLocked, selectedIds, toggleSelection]
  );

  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const handleSelectAll = useCallback(async () => {
    if (!data?.gallery || isBulkProcessing || pendingId) return;
    setIsBulkProcessing(true);
    try {
      const res = await fetch(`/api/public/gallery/${token}/select/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-all",
          photos: data.gallery.photos.map((p) => ({
            storageKey: p.storageKey,
            filename: p.filename,
            url: p.url,
          })),
        }),
      });
      if (!res.ok) throw new Error("Gagal memilih semua foto");
      const result = await res.json() as { selectionCount: number };
      setSelectionCount(result.selectionCount);
      // Update selectedIds dari data gallery
      const allKeys = new Set(data.gallery.photos.map((p) => p.storageKey));
      setSelectedIds(allKeys);
      queryClient.invalidateQueries({ queryKey: ["gallery", token] });
    } catch {
      alert("Gagal memilih semua foto. Coba lagi.");
    } finally {
      setIsBulkProcessing(false);
    }
  }, [data, token, isBulkProcessing, pendingId, queryClient]);

  const handleClearAll = useCallback(async () => {
    if (!data?.gallery || isBulkProcessing || pendingId) return;
    setIsBulkProcessing(true);
    try {
      const res = await fetch(`/api/public/gallery/${token}/select/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-all" }),
      });
      if (!res.ok) throw new Error("Gagal membatalkan semua pilihan");
      setSelectionCount(0);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["gallery", token] });
    } catch {
      alert("Gagal membatalkan semua pilihan. Coba lagi.");
    } finally {
      setIsBulkProcessing(false);
    }
  }, [data, token, isBulkProcessing, pendingId, queryClient]);

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="text-sm text-slate-500">Memuat galeri...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">Galeri tidak ditemukan</p>
          <p className="mt-2 text-sm text-slate-500">Link galeri tidak valid atau sudah kadaluarsa.</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Pilihan Berhasil Dikirim! 🎉</h2>
            <p className="mt-2 text-sm text-slate-600">
              Anda telah memilih <strong>{selectedIds.size} foto</strong>. Fotografer akan segera memproses pilihan Anda.
            </p>
            {gallery.settings.thankYouMessage && (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm italic text-slate-500">
                &ldquo;{gallery.settings.thankYouMessage}&rdquo;
              </p>
            )}
            <Link
              href={`/gallery/${token}`}
              className="mt-6 inline-block w-full rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Kembali ke Galeri
            </Link>
          </div>
        </div>
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Link
                href={`/gallery/${token}`}
                className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke galeri
              </Link>
              <h1 className="truncate text-base font-bold text-slate-900">{gallery.namaProject}</h1>
            </div>
            {/* Tombol submit header — label konsisten */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || isLocked}
              className="shrink-0 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              Kirim Seleksi ({selectedIds.size})
            </button>
          </div>
          {/* Counter tunggal di bawah header — hapus duplikat SelectionCounter */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isLocked ? "bg-green-500" : isFull ? "bg-amber-500" : "bg-slate-800"}`}
                style={{ width: `${Math.min((selectedIds.size / maxSelection) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {selectedIds.size} / {maxSelection} dipilih
            </span>
          </div>
        </div>
      </header>

      {/* Instructions + Quick Actions */}
      <div className="border-b border-slate-100 bg-white px-4 py-2.5 sm:px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-3 flex-wrap">
          {/* Hint — tampil hanya jika belum ada yang dipilih */}
          {showHint ? (
            <p className="text-sm text-slate-500 flex-1">
              👆 Ketuk foto untuk memilih · Maks. <strong>{maxSelection}</strong> foto
              {isFull && !isLocked && (
                <span className="ml-2 font-semibold text-amber-600">· Kuota penuh</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-slate-500 flex-1">
              {selectedIds.size} foto dipilih · Maks. <strong>{maxSelection}</strong>
              {isFull && !isLocked && (
                <span className="ml-2 font-semibold text-amber-600">· Kuota penuh</span>
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
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  {isBulkProcessing ? "..." : "Batal Semua"}
                </button>
              )}
              {selectedIds.size === 0 && gallery.photos.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={!!pendingId || isFull || isBulkProcessing}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <p className="text-slate-500">Belum ada foto di galeri ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.photos.map((photo, index) => (
              <PhotoSelectCard
                key={photo.id}
                photo={photo}
                index={index}
                isSelected={selectedIds.has(photo.storageKey)}
                isFull={isFull}
                isLocked={isLocked}
                onToggle={handleToggle}
                isPending={pendingId === photo.storageKey}
              />
            ))}
          </div>
        )}

        {/* Bottom Submit — label konsisten dengan header */}
        {gallery.photos.length > 0 && !isLocked && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.size === 0}
              className="rounded-full bg-slate-900 px-10 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              Kirim Seleksi ({selectedIds.size} foto)
            </button>
            {selectedIds.size === 0 && (
              <p className="mt-2 text-xs text-slate-500">Pilih minimal 1 foto untuk mengirim</p>
            )}
          </div>
        )}

        {/* Footer credit studio */}
        <div className="mt-10 pb-6 text-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} {gallery.vendor.namaStudio ?? "Photography"} · Galeri foto eksklusif
          </p>
        </div>
      </main>
    </div>
  );
}
