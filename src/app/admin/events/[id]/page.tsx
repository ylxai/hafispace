"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { StatusBadge } from "@/components/admin";
import { useToast } from "@/components/ui/toast";
import { WhatsappIcon } from "@/components/icons/whatsapp-icon";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/format";



// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type PaymentType = "DP" | "PELUNASAN" | "LAINNYA";
type DpStatus = "UNPAID" | "PARTIAL" | "PAID";

interface Payment {
  id: string;
  jumlah: number;
  tipe: PaymentType;
  keterangan: string | null;
  buktiBayar: string | null;
  createdAt: string;
}

interface Paket {
  id: string;
  namaPaket: string;
  kategori: string;
  harga: number;
  kuotaEdit: number | null;
  includeCetak: Array<{ nama: string; jumlah: number }> | null;
  deskripsi: string | null;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
}

interface Gallery {
  id: string;
  namaProject: string;
  status: string;
  clientToken: string;
  createdAt: string;
}

interface Booking {
  id: string;
  kodeBooking: string;
  namaClient: string;
  hpClient: string;
  emailClient: string | null;
  tanggalSesi: string | null;
  lokasiSesi: string | null;
  status: BookingStatus;
  hargaPaket: number;
  dpAmount: number;
  dpStatus: DpStatus;
  notes: string | null;
  createdAt: string;
  paketId: string | null;
  paket: Paket | null;
  client: Client | null;
  payments: Payment[];
  galleries: Gallery[];
}

interface BookingDetailResponse {
  booking: Booking;
  summary: {
    totalBayar: number;
    sisaTagihan: number;
    lunas: boolean;
  };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const queryClient = useQueryClient();
  const toast = useToast();

  const [paymentForm, setPaymentForm] = useState({
    jumlah: "",
    tipe: "DP" as PaymentType,
    keterangan: "",
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch booking detail
  const { data, isLoading, error } = useQuery<BookingDetailResponse>({
    queryKey: ["booking-detail", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bookings/${bookingId}`);
      if (!res.ok) throw new Error("Gagal memuat detail booking");
      return res.json() as Promise<BookingDetailResponse>;
    },
  });

  const booking = data?.booking;
  const summary = data?.summary;

  // Handle payment submission
  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentForm.jumlah || Number(paymentForm.jumlah) <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }

    setIsSavingPayment(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentForm,
          jumlah: Number(paymentForm.jumlah),
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "Gagal menyimpan pembayaran");
        return;
      }

      toast.success("Pembayaran berhasil dicatat!");
      setPaymentForm({ jumlah: "", tipe: "DP", keterangan: "" });
      await queryClient.invalidateQueries({ queryKey: ["booking-detail", bookingId] });
    } catch {
      toast.error("Gagal menyimpan pembayaran");
    } finally {
      setIsSavingPayment(false);
    }
  }

  // Handle payment deletion
  async function handleDeletePayment(paymentId: string) {
    if (!confirm("Hapus catatan pembayaran ini?")) return;

    try {
      const res = await fetch(
        `/api/admin/bookings/${bookingId}/payments?paymentId=${paymentId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        toast.error("Gagal menghapus pembayaran");
        return;
      }

      toast.success("Pembayaran dihapus");
      await queryClient.invalidateQueries({ queryKey: ["booking-detail", bookingId] });
    } catch {
      toast.error("Gagal menghapus pembayaran");
    }
  }

  // Handle status update
  async function handleUpdateStatus(newStatus: BookingStatus) {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "Gagal mengubah status");
        return;
      }

      toast.success("Status berhasil diubah!");
      await queryClient.invalidateQueries({ queryKey: ["booking-detail", bookingId] });
    } catch {
      toast.error("Gagal mengubah status");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  // Copy invoice link
  function handleCopyInvoiceLink() {
    if (!booking) return;
    const invoiceUrl = `${window.location.origin}/invoice/${booking.kodeBooking}`;
    navigator.clipboard.writeText(invoiceUrl);
    toast.success("Link invoice disalin!");
  }

  // Open invoice in new tab
  function handleOpenInvoice() {
    if (!booking) return;
    window.open(`/invoice/${booking.kodeBooking}`, "_blank");
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <span className="text-sm text-slate-600">Memuat detail booking...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="rounded-2xl bg-red-50 p-6 text-center max-w-md">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-red-900">Booking tidak ditemukan</h3>
          <p className="mt-2 text-sm text-red-600">
            Data booking tidak dapat dimuat atau tidak tersedia.
          </p>
          <Link
            href="/admin/events"
            className="mt-6 inline-block rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Kembali ke Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Kembali ke Events
          </Link>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{booking.namaClient}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500 font-mono">{booking.kodeBooking}</span>
                <StatusBadge label={booking.status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Section 1: Informasi Booking */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Informasi Booking</h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Tanggal Sesi</p>
                  <p className="text-sm text-slate-900">{formatDate(booking.tanggalSesi)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Lokasi</p>
                  <p className="text-sm text-slate-900">{booking.lokasiSesi ?? "-"}</p>
                </div>
              </div>

              {booking.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Catatan</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                    {booking.notes}
                  </p>
                </div>
              )}

              {/* Paket Info */}
              {booking.paket && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">Paket</p>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">{booking.paket.namaPaket}</h3>
                      <span className="rounded-full bg-sky-100 text-sky-700 px-2.5 py-0.5 text-xs font-medium">
                        {booking.paket.kategori}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-slate-900 mb-2">
                      {formatRupiah(booking.paket.harga)}
                    </p>
                    {booking.paket.kuotaEdit && (
                      <p className="text-xs text-slate-600">
                        ✏️ {booking.paket.kuotaEdit} file diedit
                      </p>
                    )}
                    {booking.paket.deskripsi && (
                      <p className="text-xs text-slate-600 mt-1">{booking.paket.deskripsi}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Client Info */}
              {booking.client && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">Klien</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Nama</span>
                      <span className="text-sm font-medium text-slate-900">
                        {booking.client.name}
                      </span>
                    </div>
                    {booking.hpClient && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">HP</span>
                        <a
                          href={`https://wa.me/${booking.hpClient.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
                        >
                          {booking.hpClient}
                          <WhatsappIcon className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                    {booking.client.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Email</span>
                        <span className="text-sm font-medium text-slate-900">
                          {booking.client.email}
                        </span>
                      </div>
                    )}
                    {booking.client.instagram && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Instagram</span>
                        <a
                          href={`https://instagram.com/${booking.client.instagram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-pink-600 hover:text-pink-700"
                        >
                          {booking.client.instagram}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Pembayaran */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Pembayaran</h2>

            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Total Tagihan
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatRupiah(booking.hargaPaket)}
                  </p>
                </div>
                <div className="rounded-xl bg-green-50 p-4 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-green-500">
                    Terbayar
                  </p>
                  <p className="mt-1 text-sm font-bold text-green-700">
                    {formatRupiah(summary.totalBayar)}
                  </p>
                </div>
                <div
                  className={`rounded-xl p-4 text-center ${
                    summary.lunas ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Sisa Tagihan
                  </p>
                  <p
                    className={`mt-1 text-sm font-bold ${
                      summary.lunas ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {summary.lunas ? "LUNAS ✓" : formatRupiah(summary.sisaTagihan)}
                  </p>
                </div>
              </div>
            )}

            {/* Payment History */}
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Riwayat Pembayaran
              </p>
              {booking.payments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-xl">
                  Belum ada pembayaran dicatat
                </p>
              ) : (
                <ul className="space-y-2">
                  {booking.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              payment.tipe === "DP"
                                ? "bg-sky-100 text-sky-700"
                                : payment.tipe === "PELUNASAN"
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {payment.tipe}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {formatRupiah(Number(payment.jumlah))}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDateTime(payment.createdAt)}
                          {payment.keterangan && ` · ${payment.keterangan}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(payment.id)}
                        className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Payment Form */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                + Catat Pembayaran Baru
              </p>
              <form onSubmit={handleSubmitPayment} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Jumlah (Rp) *
                    </label>
                    <input
                      type="number"
                      value={paymentForm.jumlah}
                      onChange={(e) =>
                        setPaymentForm((f) => ({ ...f, jumlah: e.target.value }))
                      }
                      placeholder="0"
                      min={1}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Tipe *
                    </label>
                    <select
                      value={paymentForm.tipe}
                      onChange={(e) =>
                        setPaymentForm((f) => ({
                          ...f,
                          tipe: e.target.value as PaymentType,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white"
                    >
                      <option value="DP">DP</option>
                      <option value="PELUNASAN">Pelunasan</option>
                      <option value="LAINNYA">Lainnya</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    value={paymentForm.keterangan}
                    onChange={(e) =>
                      setPaymentForm((f) => ({ ...f, keterangan: e.target.value }))
                    }
                    placeholder="Transfer BCA, tunai, dll."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingPayment}
                  className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition"
                >
                  {isSavingPayment ? "Menyimpan..." : "Catat Pembayaran"}
                </button>
              </form>
            </div>
          </div>

          {/* Section 5: Galleries */}
          {booking.galleries.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Galleries ({booking.galleries.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {booking.galleries.slice(0, 5).map((gallery) => (
                  <Link
                    key={gallery.id}
                    href={`/admin/galleries/${gallery.id}`}
                    className="group rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center">
                        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-700">
                          {gallery.namaProject}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(gallery.createdAt)}
                        </p>
                      </div>
                      <svg
                        className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
              {booking.galleries.length > 5 && (
                <p className="text-xs text-slate-500 text-center mt-3">
                  +{booking.galleries.length - 5} galeri lainnya
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Section 3: Status Management */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Status Management</h2>
            <div className="space-y-2">
              {(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as BookingStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleUpdateStatus(status)}
                    disabled={isUpdatingStatus || booking.status === status}
                    className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                      booking.status === status
                        ? "bg-slate-900 text-white cursor-default"
                        : "border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                    }`}
                  >
                    {booking.status === status && "✓ "}
                    {status}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Section 4: Invoice */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Invoice</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Link Invoice Publik</p>
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 font-mono break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/invoice/{booking.kodeBooking}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyInvoiceLink}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </button>
                <button
                  type="button"
                  onClick={handleOpenInvoice}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition flex items-center justify-center gap-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Buka
                </button>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Metadata</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Dibuat</span>
                <span className="text-slate-900 font-medium">
                  {formatDate(booking.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Booking ID</span>
                <span className="text-slate-900 font-mono">{booking.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
