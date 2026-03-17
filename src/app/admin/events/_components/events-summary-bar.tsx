"use client";

/**
 * Summary Bar — stat ringkasan bookings (Total, Active, Pending, Completed).
 */

type SummaryCard = {
  label: string;
  value: number;
};

type EventsSummaryBarProps = {
  cards: SummaryCard[];
  totalFromServer: number;
  isLoading?: boolean;
};

export function EventsSummaryBar({ cards, totalFromServer, isLoading }: EventsSummaryBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 flex-1">
        {cards.map((card) => (
          <div
            key={card.label}
            className="group rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl px-4 py-3 shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="inline-block h-7 w-12 animate-pulse rounded-lg bg-slate-200/60" />
              ) : (
                card.value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Total from server */}
      <div className="shrink-0 text-right text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{totalFromServer}</span> total booking
      </div>
    </div>
  );
}
