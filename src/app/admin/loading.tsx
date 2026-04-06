import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for all admin pages.
 * Shown by Next.js App Router while page data is loading.
 */
export default function AdminLoading() {
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200/80 rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-slate-200/60 rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-slate-200/60 rounded-lg animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <Skeleton variant="card" count={3} />

      {/* Table skeleton */}
      <Skeleton variant="table-row" count={5} />
    </div>
  );
}
