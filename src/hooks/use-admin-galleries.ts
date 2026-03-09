import { useQuery } from "@tanstack/react-query";

type AdminGallery = {
  id: string;
  namaProject: string;
  status: "DRAFT" | "IN_REVIEW" | "DELIVERED";
  clientToken: string;
  viewCount: number;
  photoCount: number;
  selectionCount: number;
  clientName: string;
  createdAt: string;
};

type AdminGalleriesResponse = {
  items: AdminGallery[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

async function fetchAdminGalleries(page: number, limit: number): Promise<AdminGalleriesResponse> {
  const response = await fetch(`/api/admin/galleries?page=${page}&limit=${limit}`);

  if (!response.ok) {
    throw new Error("Failed to load galleries");
  }

  return response.json() as Promise<AdminGalleriesResponse>;
}

export function useAdminGalleries(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["admin-galleries", page, limit],
    queryFn: () => fetchAdminGalleries(page, limit),
    staleTime: 30 * 1000,       // 30 detik — data dianggap fresh
    gcTime: 5 * 60 * 1000,      // 5 menit — cache dibersihkan setelah tidak digunakan
  });
}
