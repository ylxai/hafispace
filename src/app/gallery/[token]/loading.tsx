/**
 * Loading state for gallery page.
 * Shown while gallery data is being fetched.
 */
export default function GalleryLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header skeleton */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-5 w-40 bg-slate-200/80 rounded animate-pulse" />
            <div className="h-3 w-24 bg-slate-200/60 rounded animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-slate-200/60 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Photo grid skeleton */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-slate-200/60 animate-pulse"
              style={{ animationDelay: `${(i % 5) * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
