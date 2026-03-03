"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SUCCESS_FEEDBACK_DURATION_MS, UPLOAD_COMPLETE_FEEDBACK_MS } from "@/lib/constants";
import { StatusBadge } from "@/components/admin";
import { useAdminGalleries } from "@/hooks/use-admin-galleries";
import { DragDropUpload } from "@/components/admin/drag-drop-upload";
import { ImageEditor } from "@/components/admin/image-editor";
import { SelectionsModal } from "@/components/admin/selections-modal";
import ViesusPreview from "@/components/admin/viesus-preview";
import { useToast } from "@/components/ui/toast";

type AdminGallery = {
  id: string;
  namaProject: string;
  status: "DRAFT" | "IN_REVIEW" | "DELIVERED";
  clientToken: string;
  viewCount: number;
  photoCount: number;
  selectionCount: number;
  clientName: string;
  createdAt: string;
};

const STATUS_OPTIONS: AdminGallery["status"][] = ["DRAFT", "IN_REVIEW", "DELIVERED"];

function UploadPhotosModal({ gallery, onClose }: { gallery: AdminGallery; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showEditor, setShowEditor] = useState<{ file: File; index: number } | null>(null);
  const [uploadStats, setUploadStats] = useState<{ successful: number; failed: number } | null>(null);
  const [editedFiles, setEditedFiles] = useState<Map<number, File>>(new Map());

  const handleUploadComplete = (stats: { successful: number; failed: number }) => {
    setUploadStats(stats);
    queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
    if (stats.successful > 0 && stats.failed === 0) {
      setTimeout(() => { onClose(); }, SUCCESS_FEEDBACK_DURATION_MS);
    }
  };

  const handleEditFile = (file: File, index: number) => {
    setShowEditor({ file, index });
  };

  const handleEditComplete = (editedFile: File) => {
    if (!showEditor) return;
    // Simpan edited file untuk dikirim ke DragDropUpload
    setEditedFiles((prev) => new Map(prev).set(showEditor.index, editedFile));
    setShowEditor(null);
    toast.success("Image edited — siap di-upload!");
  };

  void editedFiles; // akan digunakan di DragDropUpload ketika mendukung file replacement

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upload Photos to Gallery</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:text-slate-600" aria-label="Close">✕</button>
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 p-4">
          <p className="text-base font-semibold text-slate-900">{gallery.namaProject}</p>
          <p className="text-sm text-slate-600">Client: {gallery.clientName}</p>
          <div className="mt-2 flex gap-4 text-xs text-slate-500">
            <span>{gallery.photoCount} existing photos</span>
            <span>{gallery.selectionCount} selections</span>
            <span>{gallery.viewCount} views</span>
          </div>
        </div>

        {showEditor ? (
          <ImageEditor
            file={showEditor.file}
            onEditComplete={handleEditComplete}
            onCancel={() => setShowEditor(null)}
          />
        ) : (
          <DragDropUpload
            galleryId={gallery.id}
            onUploadComplete={handleUploadComplete}
            onCancel={onClose}
            onEditFile={handleEditFile}
          />
        )}

        {uploadStats && (
          <div className="mt-4 rounded-xl bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              ✓ Upload complete: {uploadStats.successful} successful, {uploadStats.failed} failed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditGalleryModal({ gallery, onClose }: { gallery: AdminGallery; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<AdminGallery["status"]>(gallery.status);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSelections, setShowSelections] = useState(false);
  const [showViesus, setShowViesus] = useState(false);
  const [firstPhoto, setFirstPhoto] = useState<{ url: string; publicId: string; vendorId: string } | null>(null);
  const galleryUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/gallery/${gallery.clientToken}`;

  async function handleShowViesus() {
    if (!showViesus && !firstPhoto) {
      try {
        const res = await fetch(`/api/admin/galleries/${gallery.id}/selections`);
        if (res.ok) {
          const data = await res.json() as {
            photos?: Array<{ url: string; storageKey: string }>;
            gallery?: { vendorId: string };
          };
          const photo = data.photos?.[0];
          if (photo) {
            setFirstPhoto({
              url: photo.url,
              publicId: photo.storageKey,
              vendorId: data.gallery?.vendorId ?? "",
            });
          } else {
            toast.error("Belum ada foto di galeri ini.");
            return;
          }
        }
      } catch {
        toast.error("Gagal memuat foto galeri.");
        return;
      }
    }
    setShowViesus((v) => !v);
  }

  // Safety check for gallery data
  if (!gallery?.id) {
    return null;
  }

  async function handleSaveStatus() {
    if (status === gallery.status) { 
      onClose(); 
      return; 
    }
    
    setIsSaving(true);
    setError("");
    
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) throw new Error("Failed to update gallery status");
      
      await queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
      setSaved(true);
      toast.success("Gallery status updated!");
      
      setTimeout(() => { 
        setSaved(false); 
        onClose(); 
      }, UPLOAD_COMPLETE_FEEDBACK_MS);
    } catch {
      setError("Failed to save. Please try again.");
      toast.error("Failed to update gallery status");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete "${gallery.namaProject}"? This action cannot be undone.`)) {
      return;
    }

    setIsSaving(true);
    setError("");
    
    try {
      const res = await fetch(`/api/admin/galleries?id=${gallery.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.code === "HAS_PHOTOS") {
          toast.error(data.message);
        } else {
          toast.error(data.message ?? "Failed to delete gallery");
        }
        return;
      }

      toast.success("Gallery deleted successfully");
      await queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
      onClose();
    } catch {
      toast.error("Failed to delete gallery");
    } finally {
      setIsSaving(false);
    }
  }

  if (showUploadModal) {
    return <UploadPhotosModal gallery={gallery} onClose={() => setShowUploadModal(false)} />;
  }

  if (showSelections) {
    return <SelectionsModal galleryId={gallery.id} onClose={() => setShowSelections(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Manage Gallery</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:text-slate-600" aria-label="Close">✕</button>
        </div>

        <div className="space-y-4">
          {/* Gallery Info */}
          <div className="rounded-xl bg-slate-50 p-4 space-y-2">
            <p className="text-base font-semibold text-slate-900">{gallery.namaProject}</p>
            <p className="text-sm text-slate-600">Client: {gallery.clientName}</p>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>{gallery.photoCount} photos</span>
              <span>{gallery.selectionCount} selections</span>
              <span>{gallery.viewCount} views</span>
            </div>
          </div>

          {/* Client Access Link */}
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Client Gallery Link</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={galleryUrl}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(galleryUrl);
                  toast.success("Link copied to clipboard");
                }}
                className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-300"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Status Management */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Gallery Status</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    status === s
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && <p className="text-sm text-green-600">✓ Status updated!</p>}

          {/* VIESUS Preview Section */}
          {showViesus && firstPhoto && (
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-3 text-xs font-medium text-slate-600 uppercase tracking-wider">VIESUS Enhancement Preview</p>
              <ViesusPreview
                imageUrl={firstPhoto.url}
                publicId={firstPhoto.publicId}
                vendorId={firstPhoto.vendorId}
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:border-slate-300"
          >
            Upload Photos
          </button>
          <button
            type="button"
            onClick={handleShowViesus}
            className="rounded-full border border-sky-200 px-5 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50"
          >
            {showViesus ? "Hide VIESUS" : "VIESUS Preview"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving}
            className="rounded-full border border-red-200 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:border-slate-300">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveStatus}
            disabled={isSaving}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}




export default function AdminGalleriesPage() {
  const { data, isLoading } = useAdminGalleries();
  const [selectedGallery, setSelectedGallery] = useState<AdminGallery | null>(null);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionStatus, setBulkActionStatus] = useState<AdminGallery["status"] | "">("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  
  const galleries = data?.items ?? [];

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
        <div className="fixed top-16 left-0 right-0 z-40 bg-amber-50 border-b border-amber-200 p-4 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-amber-800 font-medium">
                {selectedGalleryIds.size} gallery(ies) selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedGalleryIds(new Set())}
                className="text-amber-600 hover:text-amber-800 text-sm font-medium"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={bulkActionStatus}
                onChange={(e) => setBulkActionStatus(e.target.value as AdminGallery["status"])}
                className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-400"
              >
                <option value="">Select status</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DELIVERED">Delivered</option>
              </select>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={!bulkActionStatus || isBulkProcessing}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Update Status
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete Selected
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
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              Galleries
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl">
          Curate and publish professional photo galleries for your clients.
        </p>
      </header>

      {/* Gallery Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="group rounded-3xl border border-slate-200 bg-white/50 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:shadow-glass hover:border-white/30 animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="h-5 w-40 bg-slate-200/80 rounded-lg" />
                    <div className="h-4 w-28 bg-slate-200/60 rounded" />
                  </div>
                  <div className="h-7 w-24 bg-slate-200/60 rounded-full" />
                </div>
                <div className="mt-5 flex items-center gap-4">
                  <div className="h-8 w-16 bg-slate-200/60 rounded-lg" />
                  <div className="h-8 w-16 bg-slate-200/60 rounded-lg" />
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
              <h3 className="text-lg font-semibold text-slate-900">No galleries yet</h3>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Create your first gallery to start sharing professional photo collections with your clients.
              </p>
            </div>
          </div>
         ) : (
           <div className="space-y-5">
             {/* Select All Header */}
             {galleries.length > 1 && (
               <div className="flex items-center justify-between px-1">
                 <label className="flex items-center gap-2 text-sm text-slate-600">
                   <input
                     type="checkbox"
                     checked={selectedGalleryIds.size > 0 && selectedGalleryIds.size === galleries.length}
                     onChange={handleSelectAll}
                     className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                   />
                   <span>Select all {galleries.length} galleries</span>
                 </label>
               </div>
             )}
             
             {galleries.map((gallery) => (
               <div
                 key={gallery.id}
                 className={`group relative rounded-3xl border bg-white/70 backdrop-blur-xl p-6 shadow-sm transition-all duration-300 hover:shadow-glass hover:-translate-y-1 overflow-hidden cursor-pointer ${
                   selectedGalleryIds.has(gallery.id)
                     ? "border-sky-400 ring-2 ring-sky-100"
                     : "border-slate-200 hover:border-white/40"
                 }`}
                 onClick={() => setSelectedGallery(gallery)}
               >
                 {/* Checkbox overlay */}
                 <div 
                   className="absolute top-4 right-4 z-10"
                   onClick={(e) => {
                     e.stopPropagation();
                     handleSelectGallery(gallery.id);
                   }}
                 >
                   <input
                     type="checkbox"
                     checked={selectedGalleryIds.has(gallery.id)}
                     onChange={() => handleSelectGallery(gallery.id)}
                     className="h-5 w-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                   />
                 </div>
                 
                 {/* Subtle gradient overlay on hover */}
                 <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-sky-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                 
                 {/* Content */}
                 <div className="relative">
                   <div className="flex items-start justify-between">
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
                   <div className="mt-5 flex items-center gap-3">
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
                   >
                     Manage Gallery
                   </button>
                 </div>
               </div>
             ))}
           </div>
         )}
       </div>
     </section>
   );
 }