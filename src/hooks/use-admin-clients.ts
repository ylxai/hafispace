import { useQuery } from "@tanstack/react-query";

type AdminClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  totalBooking: number;
  createdAt: string;
};

type AdminClientsResponse = {
  items: AdminClient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

async function fetchAdminClients(page: number, limit: number): Promise<AdminClientsResponse> {
  const response = await fetch(`/api/admin/clients?page=${page}&limit=${limit}`);

  if (!response.ok) {
    throw new Error("Failed to load clients");
  }

  return response.json() as Promise<AdminClientsResponse>;
}

export function useAdminClients(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["admin-clients", page, limit],
    queryFn: () => fetchAdminClients(page, limit),
    staleTime: 60 * 1000,       // 1 menit — clients jarang berubah
    gcTime: 10 * 60 * 1000,     // 10 menit — cache lebih lama
  });
}
