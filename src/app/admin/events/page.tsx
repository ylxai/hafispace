"use client";

import { useMemo, useState, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";

import { StatusBadge } from "@/components/admin";
import { PageHeader } from "@/components/admin/shared";
import { useAdminEvents } from "@/hooks/use-admin-events";
import { useToast } from "@/components/ui/toast";
import { WhatsappIcon } from "@/components/icons/whatsapp-icon";
import { PaymentModal } from "./_components/payment-modal";
import { CreateBookingModal } from "./_components/create-booking-modal";
import { EventsBulkActions } from "./_components/events-bulk-actions";
import { EventsFilterBar } from "./_components/events-filter-bar";
import { EventsSummaryBar } from "./_components/events-summary-bar";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination, Skeleton } from "@/components/ui";
import { formatRupiah } from "@/lib/format";

const DP_STATUS_MAP: Record<string, { label: string; className: string }> = {
  PAID: { label: "Lunas", className: "bg-green-100 text-green-700" },
  PARTIAL: { label: "Partial", className: "bg-amber-100 text-amber-700" },
  UNPAID: { label: "Belum Bayar", className: "bg-slate-100 text-slate-500" },
};

// ─── Payment Modal ────────────────────────────────────────────────────────────

function AdminEventsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const { data, isLoading, error, refetch } = useAdminEvents(currentPage, 20);
  const [showModal, setShowModal] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkActionStatus, setBulkActionStatus] = useState<
    "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | ""
  >("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [paymentBookingId, setPaymentBookingId] = useState<string | null>(null);
  // Filter state — baca dari URL params agar bisa bookmark & refresh tidak hilang
  const searchQuery = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const [showFilter, setShowFilter] = useState(!!(statusFilter || dateFrom || dateTo));

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // reset ke page 1 saat filter berubah
    router.push(`?${params.toString()}`);
  };
  const toast = useToast();
  const queryClient = useQueryClient();

  const bookings = useMemo(() => {
    if (error) return [];
    let filtered = data?.items ?? [];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.namaClient.toLowerCase().includes(query) ||
          b.kodeBooking.toLowerCase().includes(query) ||
          b.hpClient?.toLowerCase().includes(query),
      );
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter((b) => b.tanggalSesi >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((b) => b.tanggalSesi <= dateTo);
    }

    return filtered;
  }, [data?.items, searchQuery, statusFilter, dateFrom, dateTo, error]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };



  const eventSummary = useMemo(() => {
    const total = bookings.length;
    const active = bookings.filter(
      (booking) => booking.status === "CONFIRMED",
    ).length;
    const draft = bookings.filter(
      (booking) => booking.status === "PENDING",
    ).length;
    const completed = bookings.filter(
      (booking) => booking.status === "COMPLETED",
    ).length;

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
    
  };

  const handleSelectAll = () => {
    if (selectedBookingIds.size === bookings.length) {
      setSelectedBookingIds(new Set());
      
    } else {
      setSelectedBookingIds(new Set(bookings.map((b) => b.id)));
      
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

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedBookingIds.size} booking(s)? This action cannot be undone.`,
      )
    ) {
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
          toast.error(
            `Cannot delete ${result.bookingsWithGalleries.length} booking(s) with galleries. Delete galleries first.`,
          );
          // Show specific bookings that can't be deleted
          result.bookingsWithGalleries.forEach(
            (b: { namaClient: string; galleryCount: number }) => {
              console.warn(
                `Booking "${b.namaClient}" has ${b.galleryCount} gallery(ies)`,
              );
            },
          );
        } else {
          toast.error(result.message ?? "Failed to delete bookings");
        }
        return;
      }

      toast.success(result.message);
      setSelectedBookingIds(new Set());
      
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
        <PaymentModal
          bookingId={paymentBookingId}
          onClose={() => setPaymentBookingId(null)}
        />
      )}

      {/* Bulk Actions Bar */}
      <EventsBulkActions
        selectedCount={selectedBookingIds.size}
        bulkActionStatus={bulkActionStatus}
        isBulkProcessing={isBulkProcessing}
        onClear={() => { setSelectedBookingIds(new Set());  }}
        onStatusChange={(s) => setBulkActionStatus(s)}
        onUpdate={handleBulkUpdate}
        onDelete={handleBulkDelete}
      />

      {/* Header */}
      <PageHeader
        label="Booking Manager"
        title="Events"
        subtitle="Track upcoming sessions and manage delivery timelines."
      >
        <a
          href="/api/admin/bookings/export"
          download
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </a>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Event
        </button>
      </PageHeader>
      {/* Filters */}
      <EventsFilterBar
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        showFilter={showFilter}
        onFilterChange={setFilter}
        onToggleFilter={() => setShowFilter(!showFilter)}
      />


      {/* Error State */}
      {error && (
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-sm">
          <ErrorState message="Failed to load bookings" onRetry={() => refetch()} />
        </div>
      )}

      {/* Stats Grid */}
      {/* Stats */}
      {!error && (
        <EventsSummaryBar
          cards={eventSummary}
          totalFromServer={data?.pagination.total ?? 0}
          isLoading={isLoading}
        />
      )}


      {/* Bookings Table — Desktop (hidden di mobile, pakai card list) */}
      {!error && <div className="hidden sm:block overflow-hidden rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-slate-50/80 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-12">
                  {bookings.length > 0 && (
                    <input
                      type="checkbox"
                      checked={
                        selectedBookingIds.size > 0 &&
                        selectedBookingIds.size === bookings.length
                      }
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                  )}
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Client
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Package
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Session Date
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Dana Masuk
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Galleries
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <Skeleton variant="table-row" count={5} />
              ) : bookings.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-12 text-center text-sm text-slate-500"
                    colSpan={9}
                  >
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100/80">
                      <svg
                        className="h-8 w-8 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="font-medium text-slate-900">
                      No bookings yet
                    </p>
                    <p className="mt-1 text-slate-600">
                      Create your first booking to get started
                    </p>
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
                        {booking.namaClient}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-500 font-mono">
                          {booking.kodeBooking}
                        </p>
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
                      {new Date(booking.tanggalSesi).toLocaleDateString(
                        "id-ID",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge label={booking.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {booking.dpAmount
                            ? formatRupiah(booking.dpAmount)
                            : "-"}
                        </p>
                        {booking.dpStatus && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${DP_STATUS_MAP[booking.dpStatus]?.className ?? "bg-slate-100 text-slate-500"}`}
                          >
                            {DP_STATUS_MAP[booking.dpStatus]?.label ??
                              booking.dpStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs font-medium text-slate-700">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
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
        {data?.pagination && (
          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            totalItems={data.pagination.total}
            itemsPerPage={data.pagination.limit}
            onPageChange={handlePageChange}
          />
        )}
      </div>}

      {/* Bookings Card List — Mobile only (hidden di sm+) */}
      {!error && <div className="sm:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl p-4 shadow-sm animate-pulse"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded bg-slate-200" />
                  <div>
                    <div className="h-4 w-32 rounded bg-slate-200 mb-2" />
                    <div className="h-3 w-20 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="h-6 w-20 rounded-full bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <div className="h-3 w-12 rounded bg-slate-200 mb-1" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                </div>
                <div>
                  <div className="h-3 w-12 rounded bg-slate-200 mb-1" />
                  <div className="h-4 w-28 rounded bg-slate-200" />
                </div>
                <div>
                  <div className="h-3 w-16 rounded bg-slate-200 mb-1" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                </div>
                <div>
                  <div className="h-3 w-16 rounded bg-slate-200 mb-1" />
                  <div className="h-4 w-20 rounded bg-slate-200" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <div className="flex-1 h-11 rounded-xl bg-slate-200" />
                <div className="flex-1 h-11 rounded-xl bg-slate-200" />
                <div className="flex-1 h-11 rounded-xl bg-slate-200" />
              </div>
            </div>
          ))
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100/80">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="font-medium text-slate-900">No bookings yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first booking to get started
            </p>
          </div>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking.id}
              className={`relative rounded-2xl border bg-white/70 backdrop-blur-xl p-4 shadow-sm transition-all ${
                selectedBookingIds.has(booking.id)
                  ? "border-sky-400 ring-2 ring-sky-100"
                  : "border-slate-200"
              }`}
            >
              {/* Checkbox + Status Row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedBookingIds.has(booking.id)}
                    onChange={() => handleSelectBooking(booking.id)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                  />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {booking.namaClient}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-slate-400 font-mono">
                        {booking.kodeBooking}
                      </p>
                      {booking.hpClient && (
                        <a
                          href={`https://wa.me/${booking.hpClient.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-500 hover:text-green-600"
                        >
                          <WhatsappIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <StatusBadge label={booking.status} />
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-slate-600">
                <div>
                  <p className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">
                    Paket
                  </p>
                  <p className="font-medium text-slate-700 mt-0.5">
                    {booking.paket || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">
                    Sesi
                  </p>
                  <p className="font-medium text-slate-700 mt-0.5">
                    {booking.tanggalSesi
                      ? new Date(booking.tanggalSesi).toLocaleDateString(
                          "id-ID",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">
                    Dana Masuk
                  </p>
                  <p className="font-medium text-slate-700 mt-0.5">
                    {booking.dpAmount ? formatRupiah(booking.dpAmount) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">
                    Galleries
                  </p>
                  <p className="font-medium text-slate-700 mt-0.5">
                    {booking.galleryCount} gallery
                  </p>
                </div>
              </div>

              {/* DP Status */}
              {booking.dpStatus && (
                <div className="mb-3">
                  <span
                    className={`text-[10px] font-medium px-2 py-1 rounded-full ${DP_STATUS_MAP[booking.dpStatus]?.className ?? "bg-slate-100 text-slate-500"}`}
                  >
                    {DP_STATUS_MAP[booking.dpStatus]?.label ?? booking.dpStatus}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentBookingId(booking.id)}
                  className="flex-1 rounded-xl border border-green-200 bg-green-50 py-2.5 text-xs font-medium text-green-700 hover:bg-green-100 transition min-h-[44px]"
                >
                  💰 Bayar
                </button>
                <a
                  href={`/admin/events/${booking.id}`}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition text-center min-h-[44px] flex items-center justify-center"
                >
                  Detail
                </a>
                <a
                  href={`/invoice/${booking.kodeBooking}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl border border-sky-200 bg-sky-50 py-2.5 text-xs font-medium text-sky-600 hover:bg-sky-100 transition text-center min-h-[44px] flex items-center justify-center"
                >
                  Invoice
                </a>
              </div>
            </div>
          ))
        )}
      </div>}
    </section>
  );
}

export default function AdminEventsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <AdminEventsContent />
    </Suspense>
  );
}
