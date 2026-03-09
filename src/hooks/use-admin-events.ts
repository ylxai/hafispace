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
  notes: string | null;
  maxSelection: number | null;
};

type AdminBookingsResponse = {
  items: AdminBooking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

async function fetchAdminBookings(page: number, limit: number): Promise<AdminBookingsResponse> {
  const response = await fetch(`/api/admin/events?page=${page}&limit=${limit}`);

  if (!response.ok) {
    throw new Error("Failed to load bookings");
  }

  return response.json() as Promise<AdminBookingsResponse>;
}

export function useAdminEvents(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["admin-bookings", page, limit],
    queryFn: () => fetchAdminBookings(page, limit),
    staleTime: 30 * 1000,       // 30 detik — data dianggap fresh
    gcTime: 5 * 60 * 1000,      // 5 menit — cache dibersihkan setelah tidak digunakan
  });
}
