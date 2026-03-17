/**
 * Shared types dan constants untuk packages feature.
 * Digunakan oleh PackageModal dan PackagesPage.
 */

export type PackageCategory = "PREWED" | "WEDDING" | "PERSONAL" | "EVENT" | "LAINNYA";

export interface IncludeCetak {
  id?: string; // ID unik untuk key React — digenerate via crypto.randomUUID()
  nama: string;
  jumlah: number;
}

export interface Package {
  id: string;
  namaPaket: string;
  kategori: PackageCategory;
  harga: number;
  deskripsi?: string | null;
  kuotaEdit?: number | null;
  maxSelection: number;
  includeCetak?: IncludeCetak[] | null;
  urutan: number;
  status: string;
  createdAt: string;
  _count: { bookings: number };
}

export const KATEGORI_LABELS: Record<PackageCategory, string> = {
  PREWED: "Prewedding",
  WEDDING: "Wedding",
  PERSONAL: "Personal",
  EVENT: "Event",
  LAINNYA: "Lainnya",
};

export const KATEGORI_COLORS: Record<PackageCategory, string> = {
  PREWED: "bg-pink-100 text-pink-700",
  WEDDING: "bg-purple-100 text-purple-700",
  PERSONAL: "bg-sky-100 text-sky-700",
  EVENT: "bg-amber-100 text-amber-700",
  LAINNYA: "bg-slate-100 text-slate-600",
};

export const FILTER_TABS: { label: string; value: PackageCategory | "ALL" }[] = [
  { label: "Semua", value: "ALL" },
  { label: "Prewedding", value: "PREWED" },
  { label: "Wedding", value: "WEDDING" },
  { label: "Personal", value: "PERSONAL" },
  { label: "Event", value: "EVENT" },
  { label: "Lainnya", value: "LAINNYA" },
];
