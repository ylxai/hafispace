/**
 * Loading state for invoice page.
 */
export default function InvoiceLoading() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Logo & header */}
        <div className="flex items-center justify-between">
          <div className="h-10 w-32 bg-slate-200/60 rounded animate-pulse" />
          <div className="h-6 w-20 bg-slate-200/40 rounded animate-pulse" />
        </div>

        <div className="border-t border-slate-200" />

        {/* Invoice details */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-32 bg-slate-200/60 rounded animate-pulse" />
              <div className="h-4 w-24 bg-slate-200/40 rounded animate-pulse" />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <div className="h-5 w-16 bg-slate-200/80 rounded animate-pulse" />
          <div className="h-7 w-36 bg-slate-200/80 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
