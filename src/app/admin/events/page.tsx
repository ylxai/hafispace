"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { StatusBadge } from "@/components/admin";
import { useAdminEvents } from "@/hooks/use-admin-events";
import { useToast } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payment {
  id: string;
  jumlah: number;
  tipe: "DP" | "PELUNASAN" | "LAINNYA";
  keterangan?: string | null;
  buktiBayar?: string | null;
  createdAt: string;
}

interface PaymentSummary {
  totalBayar: number;
  sisaTagihan: number;
  lunas: boolean;
}

interface PaymentData {
  booking: { id: string; namaClient: string; kodeBooking: string; hargaPaket: number };
  payments: Payment[];
  summary: PaymentSummary;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ jumlah: "", tipe: "DP" as "DP" | "PELUNASAN" | "LAINNYA", keterangan: "" });
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useQuery<PaymentData>({
    queryKey: ["booking-payments", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments`);
      if (!res.ok) throw new Error("Gagal memuat data pembayaran");
      return res.json() as Promise<PaymentData>;
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.jumlah || Number(form.jumlah) <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, jumlah: Number(form.jumlah) }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Gagal menyimpan pembayaran");
        return;
      }
      toast.success("Pembayaran berhasil dicatat!");
      setForm({ jumlah: "", tipe: "DP", keterangan: "" });
      await queryClient.invalidateQueries({ queryKey: ["booking-payments", bookingId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch {
      toast.error("Gagal menyimpan pembayaran");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(paymentId: string) {
    if (!confirm("Hapus catatan pembayaran ini?")) return;
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments?paymentId=${paymentId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Gagal menghapus pembayaran");
        return;
      }
      toast.success("Pembayaran dihapus");
      await queryClient.invalidateQueries({ queryKey: ["booking-payments", bookingId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch {
      toast.error("Gagal menghapus pembayaran");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Riwayat Pembayaran</h2>
            {data && <p className="text-xs text-slate-500">{data.booking.namaClient} · {data.booking.kodeBooking}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary */}
          {data && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Total Tagihan</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatRupiah(data.booking.hargaPaket)}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-green-500">Terbayar</p>
                <p className="mt-1 text-sm font-bold text-green-700">{formatRupiah(data.summary.totalBayar)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${data.summary.lunas ? "bg-green-50" : "bg-red-50"}`}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Sisa Tagihan</p>
                <p className={`mt-1 text-sm font-bold ${data.summary.lunas ? "text-green-700" : "text-red-600"}`}>
                  {data.summary.lunas ? "LUNAS ✓" : formatRupiah(data.summary.sisaTagihan)}
                </p>
              </div>
            </div>
          )}

          {/* History */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Riwayat</p>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : data?.payments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada pembayaran dicatat</p>
            ) : (
              <ul className="space-y-2">
                {data?.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          p.tipe === "DP" ? "bg-sky-100 text-sky-700" :
                          p.tipe === "PELUNASAN" ? "bg-green-100 text-green-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>{p.tipe}</span>
                        <span className="text-sm font-semibold text-slate-900">{formatRupiah(Number(p.jumlah))}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(p.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        {p.keterangan && ` · ${p.keterangan}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Form Catat Pembayaran */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">+ Catat Pembayaran</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah (Rp) *</label>
                  <input
                    type="number"
                    value={form.jumlah}
                    onChange={(e) => setForm((f) => ({ ...f, jumlah: e.target.value }))}
                    placeholder="0"
                    min={1}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipe *</label>
                  <select
                    value={form.tipe}
                    onChange={(e) => setForm((f) => ({ ...f, tipe: e.target.value as "DP" | "PELUNASAN" | "LAINNYA" }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white"
                  >
                    <option value="DP">DP</option>
                    <option value="PELUNASAN">Pelunasan</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Transfer BCA, tunai, dll."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition"
              >
                {isSaving ? "Menyimpan..." : "Catat Pembayaran"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateBookingModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const form = e.currentTarget;
    const tanggalSesiValue = (form.elements.namedItem("tanggalSesi") as HTMLInputElement).value;
    
    // Fix timezone: Parse date in user's local timezone, then convert to UTC
    const sessionDate = new Date(tanggalSesiValue);
    // Set to noon to avoid timezone edge cases
    sessionDate.setHours(12, 0, 0, 0);
    
    const data = {
      namaClient: (form.elements.namedItem("namaClient") as HTMLInputElement).value,
      hpClient: (form.elements.namedItem("hpClient") as HTMLInputElement).value,
      emailClient: (form.elements.namedItem("emailClient") as HTMLInputElement).value || undefined,
      tanggalSesi: sessionDate.toISOString(),
      lokasiSesi: (form.elements.namedItem("lokasiSesi") as HTMLInputElement).value,
      paketCustom: (form.elements.namedItem("paketCustom") as HTMLInputElement).value || undefined,
      maxSelection: parseInt((form.elements.namedItem("maxSelection") as HTMLSelectElement).value),
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value || undefined,
    };

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.details) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, val] of Object.entries(err.details as Record<string, { _errors: string[] }>)) {
            if (val._errors?.length) fieldErrors[key] = val._errors[0] ?? "";
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ form: err.message ?? "Failed to create booking" });
        }
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      onClose();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Create New Booking</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {errors.form && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{errors.form}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="namaClient">
                Client Name *
              </label>
              <input
                id="namaClient"
                name="namaClient"
                type="text"
                required
                placeholder="e.g. Ridwan & Maya"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
              {errors.namaClient && <p className="mt-1 text-xs text-red-500">{errors.namaClient}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="hpClient">
                Phone *
              </label>
              <input
                id="hpClient"
                name="hpClient"
                type="tel"
                required
                placeholder="+6281234567890"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
              {errors.hpClient && <p className="mt-1 text-xs text-red-500">{errors.hpClient}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="emailClient">
              Email
            </label>
            <input
              id="emailClient"
              name="emailClient"
              type="email"
              placeholder="client@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
            {errors.emailClient && <p className="mt-1 text-xs text-red-500">{errors.emailClient}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="tanggalSesi">
                Session Date *
              </label>
              <input
                id="tanggalSesi"
                name="tanggalSesi"
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
              {errors.tanggalSesi && <p className="mt-1 text-xs text-red-500">{errors.tanggalSesi}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="lokasiSesi">
                Location *
              </label>
              <input
                id="lokasiSesi"
                name="lokasiSesi"
                type="text"
                required
                placeholder="e.g. Gedung Serbaguna"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
              {errors.lokasiSesi && <p className="mt-1 text-xs text-red-500">{errors.lokasiSesi}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="paketCustom">
              Package Name
            </label>
            <input
              id="paketCustom"
              name="paketCustom"
              type="text"
              placeholder="e.g. Wedding Full Day"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="maxSelection">
              Max Selections *
            </label>
            <select
              id="maxSelection"
              name="maxSelection"
              required
              defaultValue="40"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="40">40 photos</option>
              <option value="80">80 photos</option>
              <option value="120">120 photos</option>
              <option value="160">160 photos</option>
              <option value="200">200 photos</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Additional notes..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
            {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminEventsPage() {
  const { data, isLoading, error } = useAdminEvents();
  const [showModal, setShowModal] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionStatus, setBulkActionStatus] = useState<"PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "">("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [paymentBookingId, setPaymentBookingId] = useState<string | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const bookings = useMemo(() => data?.items ?? [], [data?.items]);

  // Show error toast if query fails
  if (error) {
    toast.error("Failed to load bookings. Please refresh the page.");
  }

  const eventSummary = useMemo(() => {
    const total = bookings.length;
    const active = bookings.filter((booking) => booking.status === "CONFIRMED").length;
    const draft = bookings.filter((booking) => booking.status === "PENDING").length;
    const completed = bookings.filter((booking) => booking.status === "COMPLETED").length;

    return [
      { label: "Total Bookings", value: total },
      { label: "Active", value: active },
      { label: "Pending", value: draft },
      { label: "Completed", value: completed },
    ];
  }, [bookings]);

  const handleSelectBooking = (bookingId: string) => {
    const newSet = new Set(selectedBookingIds);
    if (newSet.has(bookingId)) {
      newSet.delete(bookingId);
    } else {
      newSet.add(bookingId);
    }
    setSelectedBookingIds(newSet);
    setShowBulkActions(newSet.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedBookingIds.size === bookings.length) {
      setSelectedBookingIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedBookingIds(new Set(bookings.map(b => b.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedBookingIds.size === 0 || !bulkActionStatus) return;

    setIsBulkProcessing(true);
    try {
      const res = await fetch("/api/admin/events/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          bookingIds: Array.from(selectedBookingIds),
          status: bulkActionStatus,
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        toast.error(result.message ?? "Failed to update bookings");
        return;
      }

      toast.success(result.message);
      setSelectedBookingIds(new Set());
      setShowBulkActions(false);
      setBulkActionStatus("");
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch {
      toast.error("Failed to update bookings");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBookingIds.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedBookingIds.size} booking(s)? This action cannot be undone.`)) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      const res = await fetch("/api/admin/events/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          bookingIds: Array.from(selectedBookingIds),
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        if (result.code === "HAS_GALLERIES") {
          toast.error(`Cannot delete ${result.bookingsWithGalleries.length} booking(s) with galleries. Delete galleries first.`);
          // Show specific bookings that can't be deleted
          result.bookingsWithGalleries.forEach((b: { namaClient: string; galleryCount: number }) => {
            console.warn(`Booking "${b.namaClient}" has ${b.galleryCount} gallery(ies)`);
          });
        } else {
          toast.error(result.message ?? "Failed to delete bookings");
        }
        return;
      }

      toast.success(result.message);
      setSelectedBookingIds(new Set());
      setShowBulkActions(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch {
      toast.error("Failed to delete bookings");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <section className="space-y-8">
      {showModal && <CreateBookingModal onClose={() => setShowModal(false)} />}
      {paymentBookingId && (
        <PaymentModal bookingId={paymentBookingId} onClose={() => setPaymentBookingId(null)} />
      )}
      
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-amber-50 border-b border-amber-200 p-4 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-amber-800 font-medium">
                {selectedBookingIds.size} booking(s) selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedBookingIds(new Set())}
                className="text-amber-600 hover:text-amber-800 text-sm font-medium"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={bulkActionStatus}
                onChange={(e) => setBulkActionStatus(e.target.value as "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED")}
                className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-400"
              >
                <option value="">Select status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-500 to-sky-700" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Booking Manager
              </p>
              <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
                Events
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-600 max-w-2xl">
            Track upcoming sessions and manage delivery timelines.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md"
          type="button"
          onClick={() => setShowModal(true)}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Event
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {eventSummary.map((card) => (
          <div
            key={card.label}
            className="group rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl p-6 shadow-sm transition-all duration-300 hover:shadow-glass hover:border-white/40"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded-lg bg-slate-200/60" />
              ) : (
                card.value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-12">
                {bookings.length > 0 && (
                  <input
                    type="checkbox"
                    checked={selectedBookingIds.size > 0 && selectedBookingIds.size === bookings.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                  />
                )}
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Client</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Package</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Session Date</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Dana Masuk</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Galleries</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td className="px-6 py-8 text-sm text-slate-500" colSpan={9}>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                    Loading bookings...
                  </div>
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={9}>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100/80">
                    <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="font-medium text-slate-900">No bookings yet</p>
                  <p className="mt-1 text-slate-600">Create your first booking to get started</p>
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr 
                  key={booking.id} 
                  className={`text-slate-700 transition-colors duration-200 hover:bg-slate-50/50 ${
                    selectedBookingIds.has(booking.id) ? "bg-slate-50" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedBookingIds.has(booking.id)}
                      onChange={() => handleSelectBooking(booking.id)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900 tracking-tight">
                      {booking.clientName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500 font-mono">{booking.kodeBooking}</p>
                      {booking.hpClient && (
                        <a
                          href={`https://wa.me/${booking.hpClient.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-500 hover:text-green-600"
                          title="WhatsApp"
                        >
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs font-medium text-slate-700">
                      {booking.paket}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(booking.tanggalSesi).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge label={booking.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {booking.dpAmount ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(booking.dpAmount)) : "-"}
                      </p>
                      {booking.dpStatus && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          booking.dpStatus === "PAID" ? "bg-green-100 text-green-700" :
                          booking.dpStatus === "PARTIAL" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {booking.dpStatus === "PAID" ? "Lunas" : booking.dpStatus === "PARTIAL" ? "Partial" : "Belum Bayar"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs font-medium text-slate-700">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {booking.galleryCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setPaymentBookingId(booking.id)}
                      className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition whitespace-nowrap"
                    >
                      💰 Bayar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
