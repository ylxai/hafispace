"use client";

/**
 * Bulk Actions Bar untuk Events — wrapper di atas BulkActionBar shared component.
 * Berisi action spesifik events: ubah status dan hapus booking.
 */

import { BulkActionBar } from "@/components/admin/shared";
import type { BookingStatus } from "@/types/admin";

type BulkStatus = BookingStatus | "";

type EventsBulkActionsProps = {
  selectedCount: number;
  bulkActionStatus: BulkStatus;
  isBulkProcessing: boolean;
  onClear: () => void;
  onStatusChange: (status: BulkStatus) => void;
  onUpdate: () => void;
  onDelete: () => void;
};

export function EventsBulkActions({
  selectedCount,
  bulkActionStatus,
  isBulkProcessing,
  onClear,
  onStatusChange,
  onUpdate,
  onDelete,
}: EventsBulkActionsProps) {
  return (
    <BulkActionBar
      selectedCount={selectedCount}
      itemLabel="booking"
      onClear={onClear}
    >
      <select
        value={bulkActionStatus}
        onChange={(e) => onStatusChange(e.target.value as BulkStatus)}
        className="flex-1 min-w-0 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-400"
      >
        <option value="">Ubah status...</option>
        <option value="PENDING">Pending</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <button
        type="button"
        onClick={onUpdate}
        disabled={!bulkActionStatus || isBulkProcessing}
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        Update
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isBulkProcessing}
        className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isBulkProcessing ? "Memproses..." : "Hapus"}
      </button>
    </BulkActionBar>
  );
}
