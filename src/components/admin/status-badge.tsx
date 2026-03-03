export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type GalleryStatus = "DRAFT" | "IN_REVIEW" | "DELIVERED";

type StatusBadgeProps = {
  label: BookingStatus | GalleryStatus;
};

const statusStyles: Record<BookingStatus | GalleryStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-rose-100 text-rose-700",
  DRAFT: "bg-slate-100 text-slate-600",
  IN_REVIEW: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
};

export function StatusBadge({ label }: StatusBadgeProps) {
  const style = statusStyles[label];

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
