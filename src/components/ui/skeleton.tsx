interface SkeletonProps {
  variant?: "card" | "table-row" | "text";
  count?: number;
}

export function Skeleton({ variant = "text", count = 1 }: SkeletonProps) {
  if (variant === "card") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-200 bg-white/50 backdrop-blur-sm p-6 shadow-sm animate-pulse"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="h-5 w-5 bg-slate-200/60 rounded shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-5 w-40 bg-slate-200/80 rounded-lg" />
                <div className="h-4 w-28 bg-slate-200/60 rounded" />
              </div>
              <div className="h-7 w-24 bg-slate-200/60 rounded-full" />
            </div>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <div className="h-8 w-16 bg-slate-200/60 rounded-xl" />
              <div className="h-8 w-16 bg-slate-200/60 rounded-xl" />
              <div className="h-8 w-16 bg-slate-200/60 rounded-xl" />
            </div>
          </div>
        ))}
      </>
    );
  }

  if (variant === "table-row") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <tr key={i} className="animate-pulse">
            <td className="px-6 py-4">
              <div className="h-4 w-4 rounded bg-slate-200" />
            </td>
            <td className="px-6 py-4">
              <div className="h-4 w-32 rounded bg-slate-200 mb-2" />
              <div className="h-3 w-20 rounded bg-slate-200" />
            </td>
            <td className="px-6 py-4">
              <div className="h-6 w-24 rounded-xl bg-slate-200" />
            </td>
            <td className="px-6 py-4">
              <div className="h-4 w-28 rounded bg-slate-200" />
            </td>
            <td className="px-6 py-4">
              <div className="h-6 w-20 rounded-full bg-slate-200" />
            </td>
            <td className="px-6 py-4">
              <div className="h-4 w-24 rounded bg-slate-200" />
            </td>
          </tr>
        ))}
      </>
    );
  }

  // variant === "text"
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded bg-slate-200 animate-pulse" />
      ))}
    </>
  );
}
