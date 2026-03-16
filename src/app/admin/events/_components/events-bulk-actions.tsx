"use client";

/**
 * Bulk Actions Bar — muncul di atas saat ada booking yang dipilih.
 * Fixed position di atas, di bawah mobile top bar.
 */

type BulkStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "";

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
  if (selectedCount === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-3 backdrop-blur-sm shadow-sm lg:left-60">
      <div className="max-w-5xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Info + Clear */}
        <div className="flex items-center gap-3">
          <span className="text-amber-800 font-medium text-sm">
            {selectedCount} booking dipilih
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-amber-600 hover:text-amber-800 text-sm font-medium underline underline-offset-2"
          >
            Batal
          </button>
        </div>
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>
    </div>
  );
}
