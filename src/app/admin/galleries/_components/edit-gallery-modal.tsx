"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  tokenExpiresAt?: string | null;
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
  const [liveSelectionCount, setLiveSelectionCount] = useState(gallery.selectionCount);
  const [clientSubmitted, setClientSubmitted] = useState(false);
  const ablyRef = useRef<unknown>(null);

  // Token management state
  const [currentToken, setCurrentToken] = useState(gallery.clientToken);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(gallery.tokenExpiresAt ?? null);
  const [expiryInput, setExpiryInput] = useState(
    gallery.tokenExpiresAt ? new Date(gallery.tokenExpiresAt).toISOString().slice(0, 16) : ""
  );
  const [isTokenLoading, setIsTokenLoading] = useState(false);

  // Gunakan env var untuk SSR-safe URL — hindari window.location yang menyebabkan hydration mismatch
  const galleryUrl = useMemo(
    () => `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/gallery/${currentToken}`,
    [currentToken]
  );

  async function handleRegenerateToken() {
    if (!confirm("Yakin ingin generate token baru? Link lama akan langsung tidak bisa diakses!")) return;
    setIsTokenLoading(true);
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}/token`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? "Gagal regenerate token");
      }
      const data = await res.json() as { clientToken: string; tokenExpiresAt: string | null };
      setCurrentToken(data.clientToken);
      setTokenExpiresAt(data.tokenExpiresAt);
      queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
      toast.success("Token berhasil di-generate ulang! Bagikan link baru ke klien.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal generate token baru");
    } finally {
      setIsTokenLoading(false);
    }
  }

  async function handleSetExpiry() {
    if (!expiryInput) return;
    setIsTokenLoading(true);
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}/token`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-expiry", expiresAt: new Date(expiryInput).toISOString() }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? "Gagal set expiry");
      }
      const data = await res.json() as { clientToken: string; tokenExpiresAt: string | null };
      setTokenExpiresAt(data.tokenExpiresAt);
      queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
      toast.success("Tanggal kedaluwarsa berhasil disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal set expiry");
    } finally {
      setIsTokenLoading(false);
    }
  }

  async function handleClearExpiry() {
    setIsTokenLoading(true);
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}/token`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-expiry" }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? "Gagal hapus expiry");
      }
      setTokenExpiresAt(null);
      setExpiryInput("");
      queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
      toast.success("Tanggal kedaluwarsa berhasil dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal hapus expiry");
    } finally {
      setIsTokenLoading(false);
    }
  }

  // Ably realtime — subscribe untuk update count & notifikasi submit dari klien
  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        const Ably = (await import("ably")).default;
        const ably = new Ably.Realtime({
          authUrl: `/api/ably-token?gallery=${gallery.clientToken}`,
        });
        ablyRef.current = ably;

        const channel = ably.channels.get(`gallery:${gallery.id}:selection`);

        await channel.subscribe("count-updated", (msg: { data?: { count?: number } }) => {
          if (!mounted) return;
          if (typeof msg.data?.count === "number") {
            setLiveSelectionCount(msg.data.count);
            queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
          }
        });

        await channel.subscribe("selection-submitted", (msg: { data?: { count?: number } }) => {
          if (!mounted) return;
          const count = msg.data?.count ?? liveSelectionCount;
          setClientSubmitted(true);
          setLiveSelectionCount(count);
          toast.success(`🎉 Klien telah mengirim seleksi ${count} foto!`);
          queryClient.invalidateQueries({ queryKey: ["admin-galleries"] });
          queryClient.invalidateQueries({ queryKey: ["admin-selections", gallery.id] });
        });
      } catch {
        // Ably tidak tersedia — silent fallback
      }
    };

    connect();

    return () => {
      mounted = false;
      if (ablyRef.current) {
        (ablyRef.current as unknown as { close: () => void }).close();
        ablyRef.current = null;
      }
    };
  }, [gallery.id, gallery.clientToken]);

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
                {liveSelectionCount} seleksi
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

          {/* Token Management — Regenerate & Expiry */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Keamanan Akses Link</p>

            {/* Status expiry */}
            {tokenExpiresAt && (
              <p className={`text-xs ${new Date(tokenExpiresAt) < new Date() ? "text-red-600 font-semibold" : "text-amber-600"}`}>
                {new Date(tokenExpiresAt) < new Date()
                  ? `⛔ Link kedaluwarsa sejak ${new Date(tokenExpiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`
                  : `⏰ Link aktif hingga ${new Date(tokenExpiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`
                }
              </p>
            )}

            {/* Set expiry date */}
            <div>
              <p className="mb-1 text-xs text-slate-500">Tanggal kedaluwarsa link (opsional)</p>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={expiryInput}
                  onChange={(e) => setExpiryInput(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={handleSetExpiry}
                  disabled={isTokenLoading || !expiryInput}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-50 transition"
                >
                  {isTokenLoading ? "..." : "Simpan"}
                </button>
                {tokenExpiresAt && (
                  <button
                    type="button"
                    onClick={handleClearExpiry}
                    disabled={isTokenLoading}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Regenerate token */}
            <div className="pt-1 border-t border-slate-200">
              <p className="mb-1 text-xs text-slate-500">Generate link baru (link lama langsung tidak aktif)</p>
              <button
                type="button"
                onClick={handleRegenerateToken}
                disabled={isTokenLoading}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition"
              >
                {isTokenLoading ? "Memproses..." : "🔄 Generate Token Baru"}
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

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          {/* Baris 1: secondary actions */}
          <div className="grid grid-cols-3 gap-2">
            {liveSelectionCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowSelections(true)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  clientSubmitted
                    ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                }`}
              >
                {clientSubmitted ? "✓" : "📋"} Seleksi ({liveSelectionCount})
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Upload Foto
            </button>
            <button
              type="button"
              onClick={handleShowViesus}
              className="rounded-lg border border-purple-200 px-3 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 transition"
            >
              {showViesus ? "Tutup VIESUS" : "VIESUS"}
            </button>
          </div>

          {/* Baris 2: primary actions */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving}
              className="rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
            >
              Hapus
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={isSaving}
                className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition"
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

