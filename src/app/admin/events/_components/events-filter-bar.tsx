"use client";

/**
 * Filter Bar untuk Events page.
 * Search selalu visible, advanced filter collapsible di mobile.
 */

type EventsFilterBarProps = {
  searchQuery: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
  showFilter: boolean;
  onFilterChange: (key: string, value: string) => void;
  onToggleFilter: () => void;
};

export function EventsFilterBar({
  searchQuery,
  statusFilter,
  dateFrom,
  dateTo,
  showFilter,
  onFilterChange,
  onToggleFilter,
}: EventsFilterBarProps) {
  const activeFilterCount = [statusFilter, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-sm">
      {/* Filter Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          {/* Search — selalu visible */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Nama, kode, HP..."
            className="w-44 sm:w-64 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
          />
          {/* Active filter badge */}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V3z"
                  clipRule="evenodd"
                />
              </svg>
              {activeFilterCount} filter aktif
            </span>
          )}
        </div>

        {/* Toggle filter button — mobile only */}
        <button
          type="button"
          onClick={onToggleFilter}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition sm:hidden"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filter
          <svg
            className={`h-3.5 w-3.5 transition-transform ${showFilter ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Extended filters — always show di desktop, collapsible di mobile */}
      <div className={`px-5 pb-5 ${showFilter ? "block" : "hidden sm:block"}`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => onFilterChange("status", e.target.value)}
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
              onChange={(e) => onFilterChange("from", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Sesi Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onFilterChange("to", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                onFilterChange("search", "");
                onFilterChange("status", "");
                onFilterChange("from", "");
                onFilterChange("to", "");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
