"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UPLOAD_COMPLETE_FEEDBACK_MS } from "@/lib/constants";
import ViesusPreview from "@/components/admin/viesus-preview";
import { useToast } from "@/components/ui/toast";
import { SelectionsModal } from "@/components/admin/selections-modal";
import { UploadPhotosModal } from "./upload-photos-modal";

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


export function EditGalleryModal({ gallery, onClose }: { gallery: AdminGallery; onClose: () => void }) {
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
              <button 
                type="button" 
                onClick={() => setShowSelections(true)} 
                className="hover:text-slate-700 hover:underline transition-colors"
                title="View Selected Photos"
              >
                {gallery.selectionCount} selections
              </button>
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

        <div className="mt-8 flex flex-col gap-4">
          {/* Main Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
            >
              <svg className="mb-2 h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Photos
            </button>
            <button
              type="button"
              onClick={() => setShowSelections(true)}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
            >
              <svg className="mb-2 h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Lihat Seleksi
            </button>
          </div>

          <div className="h-px w-full bg-slate-100 mt-2" />

          {/* Secondary & Save Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="rounded-full border border-red-100 bg-red-50/50 px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 hover:border-red-200 disabled:opacity-50"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={handleShowViesus}
                className="rounded-full border border-sky-100 bg-sky-50/50 px-4 py-2 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-100 hover:border-sky-200"
              >
                {showViesus ? "Hide VIESUS" : "VIESUS Preview"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 ml-auto">
              <button 
                type="button" 
                onClick={onClose} 
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={isSaving}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 shadow-sm"
              >
                {isSaving ? "Saving..." : "Save Status"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

