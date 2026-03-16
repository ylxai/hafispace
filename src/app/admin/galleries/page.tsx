"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin";
import { useAdminGalleries } from "@/hooks/use-admin-galleries";
import { useToast } from "@/components/ui/toast";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui";
import type { AdminGallery } from "@/types/admin";


import { EditGalleryModal } from "./_components/edit-gallery-modal";

function AdminGalleriesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const { data, isLoading, error, refetch } = useAdminGalleries(currentPage, 20);
  const [selectedGallery, setSelectedGallery] = useState<AdminGallery | null>(null);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionStatus, setBulkActionStatus] = useState<AdminGallery["status"] | "">("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  
  const galleries = data?.items ?? [];

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const handleSelectGallery = (galleryId: string) => {
    const newSet = new Set(selectedGalleryIds);
    if (newSet.has(galleryId)) {
      newSet.delete(galleryId);
    } else {
      newSet.add(galleryId);
    }
    setSelectedGalleryIds(newSet);
    setShowBulkActions(newSet.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedGalleryIds.size === galleries.length) {
      setSelectedGalleryIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedGalleryIds(new Set(galleries.map(g => g.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGalleryIds.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedGalleryIds.size} gallery(ies)? This action cannot be undone.`)) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      const res = await fetch("/api/admin/galleries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          galleryIds: Array.from(selectedGalleryIds),
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        if (result.code === "HAS_PHOTOS") {
          toast.error(`Cannot delete ${result.galleriesWithPhotos.length} gallery(ies) with photos. Delete photos first.`);
          // Show specific galleries that can't be deleted
          result.galleriesWithPhotos.forEach((g: { namaProject: string; photoCount: number }) => {
            console.warn(`Gallery "${g.namaProject}" has ${g.photoCount} photo(s)`);
          });
        } else {
          toast.error(result.message ?? "Failed to delete galleries");
        }
        return;
      }

      toast.success(result.message);
      setSelectedGalleryIds(new Set());
      setShowBulkActions(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
    } catch {
      toast.error("Failed to delete galleries");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedGalleryIds.size === 0 || !bulkActionStatus) return;

    setIsBulkProcessing(true);
    try {
      const res = await fetch("/api/admin/galleries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          galleryIds: Array.from(selectedGalleryIds),
          status: bulkActionStatus,
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        toast.error(result.message ?? "Failed to update galleries");
        return;
      }

      toast.success(result.message);
      setSelectedGalleryIds(new Set());
      setShowBulkActions(false);
      setBulkActionStatus("");
      await queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
    } catch {
      toast.error("Failed to update galleries");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <section className="space-y-8">
      {selectedGallery && (
        <EditGalleryModal gallery={selectedGallery} onClose={() => setSelectedGallery(null)} />
      )}
      
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-3 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Info + Clear */}
            <div className="flex items-center gap-3">
              <span className="text-amber-800 font-medium text-sm">
                {selectedGalleryIds.size} gallery dipilih
              </span>
              <button
                type="button"
                onClick={() => { setSelectedGalleryIds(new Set()); setShowBulkActions(false); }}
                className="text-amber-600 hover:text-amber-800 text-sm font-medium underline underline-offset-2"
              >
                Batal
              </button>
            </div>
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkActionStatus}
                onChange={(e) => setBulkActionStatus(e.target.value as AdminGallery["status"])}
                className="flex-1 min-w-0 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-400"
              >
                <option value="">Ubah status...</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DELIVERED">Delivered</option>
              </select>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={!bulkActionStatus || isBulkProcessing}
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Update
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isBulkProcessing ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-500 to-sky-700" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Gallery Manager
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl">
          Curate and publish professional photo galleries for your clients.
        </p>
      </header>

      {/* Error State */}
      {error && (
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-sm">
          <ErrorState message="Failed to load galleries" onRetry={() => refetch()} />
        </div>
      )}

      {/* Select All Header — hanya tampil jika ada lebih dari 1 gallery */}
      {!error && !isLoading && galleries.length > 1 && (
        <div className="flex items-center justify-between px-1 -mb-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedGalleryIds.size > 0 && selectedGalleryIds.size === galleries.length}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
            />
            <span>Pilih semua {galleries.length} gallery</span>
          </label>
        </div>
      )}

      {/* Gallery Grid */}
      {!error && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="group rounded-3xl border border-slate-200 bg-white/50 backdrop-blur-sm p-6 shadow-sm animate-pulse"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="h-5 w-5 bg-slate-200/60 rounded shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-5 w-40 bg-slate-200/80 rounded-lg" />
                    <div className="h-4 w-28 bg-slate-200/60 rounded" />
                  </div>
                  <div className="h-7 w-24 bg-slate-200/60 rounded-full" />
                </div>
                <div className="mt-5 flex items-center gap-3 flex-wrap">
                  <div className="h-8 w-16 bg-slate-200/60 rounded-xl" />
                  <div className="h-8 w-16 bg-slate-200/60 rounded-xl" />
                  <div className="h-8 w-16 bg-slate-200/60 rounded-xl" />
                </div>
                <div className="mt-5 h-10 w-full bg-slate-200/60 rounded-full" />
              </div>
            ))}
          </>
        ) : galleries.length === 0 ? (
          <div className="col-span-full">
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 backdrop-blur-sm p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Belum ada gallery</h3>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Buat gallery pertama untuk mulai berbagi koleksi foto profesional dengan klien Anda.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/admin/events"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Buat Booking Dulu
                </Link>
                <p className="text-xs text-slate-400 self-center">Gallery dibuat otomatis dari booking</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {galleries.map((gallery) => (
              <div
                key={gallery.id}
                className={`group relative rounded-3xl border bg-white/70 backdrop-blur-xl p-6 shadow-sm transition-all duration-300 hover:shadow-glass hover:-translate-y-1 cursor-pointer ${
                  selectedGalleryIds.has(gallery.id)
                    ? "border-sky-400 ring-2 ring-sky-100"
                    : "border-slate-200 hover:border-white/40"
                }`}
                onClick={() => setSelectedGallery(gallery)}
              >
                {/* Gradient overlay hover — pointer-events-none agar tidak block interaksi */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/0 via-white/0 to-sky-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Content */}
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    {/* Checkbox inline di kiri, sejajar dengan judul */}
                    <div
                      className="mt-0.5 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectGallery(gallery.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGalleryIds.has(gallery.id)}
                        onChange={() => handleSelectGallery(gallery.id)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-500 focus:ring-sky-400 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold text-slate-900 truncate tracking-tight">
                        {gallery.namaProject}
                      </p>
                      <p className="mt-1.5 text-sm text-slate-600 truncate">
                        {gallery.clientName}
                      </p>
                    </div>
                    <StatusBadge label={gallery.status} />
                  </div>

                  {/* Stats */}
                  <div className="mt-5 flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-2">
                      <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium text-slate-700">{gallery.photoCount}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-2">
                      <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="text-xs font-medium text-slate-700">{gallery.viewCount}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-2">
                      <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-xs font-medium text-slate-700">{gallery.selectionCount}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    className="mt-5 w-full rounded-full border border-slate-200 bg-white/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 backdrop-blur-sm transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGallery(gallery);
                    }}
                  >
                    Kelola Gallery
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>}

      {/* Pagination */}
      {!error && data?.pagination && data.pagination.totalPages > 1 && (
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-sm overflow-hidden">
          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            totalItems={data.pagination.total}
            itemsPerPage={data.pagination.limit}
            onPageChange={handlePageChange}
          />
        </div>
      )}
     </section>
   );
 }

export default function AdminGalleriesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <AdminGalleriesContent />
    </Suspense>
  );
}
