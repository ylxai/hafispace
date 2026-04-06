/**
 * Loading state for booking form page.
 */
export default function BookingLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-8 w-48 bg-slate-200/80 rounded-lg animate-pulse mx-auto" />
          <div className="h-4 w-64 bg-slate-200/60 rounded animate-pulse mx-auto" />
        </div>

        {/* Form skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 w-24 bg-slate-200/60 rounded animate-pulse" />
              <div className="h-10 w-full bg-slate-100/80 rounded-lg animate-pulse" />
            </div>
          ))}
          <div className="h-11 w-full bg-slate-200/80 rounded-lg animate-pulse mt-2" />
        </div>
      </div>
    </div>
  );
}
