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
};

async function fetchAdminGalleries(): Promise<AdminGalleriesResponse> {
  const response = await fetch("/api/admin/galleries");

  if (!response.ok) {
    throw new Error("Failed to load galleries");
  }

  return response.json() as Promise<AdminGalleriesResponse>;
}

export function useAdminGalleries() {
  return useQuery({
    queryKey: ["admin-galleries"],
    queryFn: fetchAdminGalleries,
  });
}
