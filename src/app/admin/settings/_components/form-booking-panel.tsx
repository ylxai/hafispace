"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { SAVED_FEEDBACK_DURATION_MS } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";

export function FormBookingPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const { data: session } = useSession();
  const toast = useToast();
  const [formData, setFormData] = useState({
    bookingFormActive: false,
    waAdmin: "",
    dpPercentage: 30,
    rekeningPembayaran: "",
    syaratKetentuan: "",
    themeColor: "#0f172a",
    successMessage: "",
  });

  async function loadSettings() {
    if (formData.rekeningPembayaran) return;
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setFormData({
          bookingFormActive: data.vendor.bookingFormActive ?? false,
          waAdmin: data.vendor.waAdmin ?? "",
          dpPercentage: data.vendor.dpPercentage ?? 30,
          rekeningPembayaran: data.vendor.rekeningPembayaran ?? "",
          syaratKetentuan: data.vendor.syaratKetentuan ?? "",
          themeColor: data.vendor.themeColor ?? "#0f172a",
          successMessage: data.vendor.successMessage ?? "",
        });
      }
    } catch { /* silent */ }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setFormData({
        bookingFormActive: data.vendor.bookingFormActive ?? false,
        waAdmin: data.vendor.waAdmin ?? "",
        dpPercentage: data.vendor.dpPercentage ?? 30,
        rekeningPembayaran: data.vendor.rekeningPembayaran ?? "",
        syaratKetentuan: data.vendor.syaratKetentuan ?? "",
        themeColor: data.vendor.themeColor ?? "#0f172a",
        successMessage: data.vendor.successMessage ?? "",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), SAVED_FEEDBACK_DURATION_MS);
      toast.success("Pengaturan form booking berhasil disimpan!");
    } catch {
      setError("Gagal menyimpan pengaturan. Silakan coba lagi.");
      toast.error("Gagal menyimpan pengaturan form booking");
    } finally {
      setIsSaving(false);
    }
  }

  function handleToggle() {
    if (!isOpen) loadSettings();
    setIsOpen((v) => !v);
  }

  const vendorId = session?.user?.id;
  const bookingUrl = typeof window !== "undefined" && vendorId
    ? `${window.location.origin}/booking?v=${vendorId}`
    : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Form Booking</h2>
      <p className="mt-2 text-sm text-slate-600">
        Kelola pengaturan form booking publik untuk klien.
      </p>
      <button
        type="button"
        onClick={handleToggle}
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
      >
        {isOpen ? "Close" : "Configure"}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Aktifkan Form Booking</p>
              <p className="text-xs text-slate-500">Izinkan klien mengisi form booking secara publik</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData((f) => ({ ...f, bookingFormActive: !f.bookingFormActive }))}
              className={`relative h-6 w-11 rounded-full transition ${formData.bookingFormActive ? "bg-slate-900" : "bg-slate-200"}`}
              aria-label="Toggle booking form"
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.bookingFormActive ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Nomor WhatsApp Admin
            </label>
            <div className="flex items-center gap-2">
              <span className="rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">+</span>
              <input
                type="tel"
                value={formData.waAdmin}
                onChange={(e) => setFormData((f) => ({ ...f, waAdmin: e.target.value.replace(/\D/g, '') }))}
                placeholder="6282353345446"
                className="flex-1 rounded-r-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">Format: 628xxx (tanpa + atau spasi). Digunakan untuk tombol konfirmasi WA di form booking publik.</p>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
              DP Percentage
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {formData.dpPercentage}%
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.dpPercentage}
              onChange={(e) => setFormData((f) => ({ ...f, dpPercentage: Number(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Rekening Pembayaran DP
            </label>
            <textarea
              value={formData.rekeningPembayaran}
              onChange={(e) => setFormData((f) => ({ ...f, rekeningPembayaran: e.target.value }))}
              placeholder="Contoh: BCA 1234567890 a.n. Studio Name"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Syarat & Ketentuan
            </label>
            <textarea
              value={formData.syaratKetentuan}
              onChange={(e) => setFormData((f) => ({ ...f, syaratKetentuan: e.target.value }))}
              placeholder="Ketentuan yang berlaku untuk booking..."
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Theme Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.themeColor}
                onChange={(e) => setFormData((f) => ({ ...f, themeColor: e.target.value }))}
                className="h-10 w-20 rounded-xl border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={formData.themeColor}
                onChange={(e) => setFormData((f) => ({ ...f, themeColor: e.target.value }))}
                placeholder="#0f172a"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Success Message
            </label>
            <textarea
              value={formData.successMessage}
              onChange={(e) => setFormData((f) => ({ ...f, successMessage: e.target.value }))}
              placeholder="Terima kasih! Kami akan segera menghubungi Anda..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 resize-none"
            />
          </div>

          {bookingUrl && (
            <div className="rounded-xl bg-sky-50 p-4">
              <p className="text-sm font-medium text-sky-700 mb-2">Booking Form URL</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={bookingUrl}
                  className="flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(bookingUrl);
                    toast.success("URL berhasil disalin!");
                  }}
                  className="shrink-0 rounded-lg border border-sky-200 px-3 py-2 text-xs font-medium text-sky-600 hover:bg-sky-100"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            {saved && (
              <span className="text-sm text-green-600">✓ Saved successfully</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

