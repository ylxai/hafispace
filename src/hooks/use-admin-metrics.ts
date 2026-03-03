import { useQuery } from "@tanstack/react-query";

type AdminMetrics = {
  clientCount: number;
  bookingCount: number;
  activeBookingCount: number;
  galleryCount: number;
  deliveredGalleryCount: number;
  pendingNotificationCount: number;
};

async function fetchMetrics(): Promise<AdminMetrics> {
  const response = await fetch("/api/admin/metrics");

  if (!response.ok) {
    throw new Error("Failed to load metrics");
  }

  return response.json() as Promise<AdminMetrics>;
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: fetchMetrics,
  });
}
