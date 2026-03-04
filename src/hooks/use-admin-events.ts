import { useQuery } from "@tanstack/react-query";

export type AdminBooking = {
  id: string;
  kodeBooking: string;
  namaClient: string;
  hpClient: string;
  emailClient: string | null;
  paket: string;
  tanggalSesi: string;
  lokasiSesi: string | null;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  dpAmount: number;
  dpStatus: "UNPAID" | "PARTIAL" | "PAID";
  hargaPaket: number;
  galleryCount: number;
  createdAt: string;
};

type AdminBookingsResponse = {
  items: AdminBooking[];
};

async function fetchAdminBookings(): Promise<AdminBookingsResponse> {
  const response = await fetch("/api/admin/events");

  if (!response.ok) {
    throw new Error("Failed to load bookings");
  }

  return response.json() as Promise<AdminBookingsResponse>;
}

export function useAdminEvents() {
  return useQuery({
    queryKey: ["admin-bookings"],
    queryFn: fetchAdminBookings,
  });
}
