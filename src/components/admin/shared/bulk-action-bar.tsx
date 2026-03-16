"use client";

/**
 * Generic bulk action bar — muncul fixed di atas saat ada items yang dipilih.
 * Reusable untuk Events, Galleries, Clients, Packages pages.
 */

type BulkActionBarProps = {
  selectedCount: number;
  /** Label untuk item yang dipilih, e.g. "booking", "gallery" */
  itemLabel?: string;
  onClear: () => void;
  children: React.ReactNode; // action buttons/selects
  isProcessing?: boolean;
};

export function BulkActionBar({
  selectedCount,
  itemLabel = "item",
  onClear,
  children,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-3 backdrop-blur-sm shadow-sm lg:left-60">
      <div className="max-w-5xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Info + Clear */}
        <div className="flex items-center gap-3">
          <span className="text-amber-800 font-medium text-sm">
            {selectedCount} {itemLabel} dipilih
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-amber-600 hover:text-amber-800 text-sm font-medium underline underline-offset-2"
          >
            Batal
          </button>
        </div>

        {/* Actions slot */}
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}
