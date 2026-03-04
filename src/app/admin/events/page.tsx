"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { StatusBadge } from "@/components/admin";
import { useAdminEvents } from "@/hooks/use-admin-events";
import { useToast } from "@/components/ui/toast";
import { WhatsappIcon } from "@/components/icons/whatsapp-icon";
import { formatRupiah } from "@/lib/format";
import { PaymentModal } from "./_components/payment-modal";
import { CreateBookingModal } from "./_components/create-booking-modal";

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

interface PackageOption {
  id: string;
  namaPaket: string;
  kategori: string;
  harga: number;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

// ─── Payment Modal ────────────────────────────────────────────────────────────


export default function AdminEventsPage() {
  const { data, isLoading, error } = useAdminEvents();
  const [showModal, setShowModal] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionStatus, setBulkActionStatus] = useState<"PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "">("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [paymentBookingId, setPaymentBookingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const toast = useToast();
  const queryClient = useQueryClient();

  const bookings = useMemo(() => {
    let filtered = data?.items ?? [];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b => 
        b.namaClient.toLowerCase().includes(query) ||
        b.kodeBooking.toLowerCase().includes(query) ||
        b.hpClient?.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    
    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(b => b.tanggalSesi >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(b => b.tanggalSesi <= dateTo);
    }
    
    return filtered;
  }, [data?.items, searchQuery, statusFilter, dateFrom, dateTo]);

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
        <div className="flex items-center gap-3">
          <a
            href="/api/admin/bookings/export"
            download
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </a>
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
        </div>
      </header>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Cari</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nama, kode, HP..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 bg-white"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Sesi Dari</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Sesi Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Reset Filter
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold text-slate-900">{bookings.length}</span> dari{" "}
          <span className="font-semibold text-slate-900">{data?.items.length ?? 0}</span> booking
        </div>
      </div>

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
                          <WhatsappIcon className="h-3.5 w-3.5" />
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentBookingId(booking.id)}
                        className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition whitespace-nowrap"
                      >
                        💰 Bayar
                      </button>
                      <a
                        href={`/admin/events/${booking.id}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
                      >
                        Detail
                      </a>
                      <a
                        href={`/invoice/${booking.kodeBooking}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-100 transition whitespace-nowrap"
                      >
                        Invoice
                      </a>
                    </div>
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
