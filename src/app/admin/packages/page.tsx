"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageHeader } from "@/components/admin/shared";
import { useToast } from "@/components/ui/toast";
import { formatRupiah } from "@/lib/format";

import { PackageModal } from "./_components/package-modal";
import {
  FILTER_TABS,
  KATEGORI_COLORS,
  KATEGORI_LABELS,
  type Package,
  type PackageCategory,
} from "./_components/package-types";


export default function PackagesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<PackageCategory | "ALL">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editPackage, setEditPackage] = useState<Package | undefined>();

  const { data, isLoading } = useQuery<{ packages: Package[] }>({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const res = await fetch("/api/admin/packages");
      if (!res.ok) throw new Error("Gagal memuat paket");
      return res.json() as Promise<{ packages: Package[] }>;
    },
    staleTime: 30_000,
  });

  const packages = data?.packages ?? [];
  const filtered = activeFilter === "ALL" ? packages : packages.filter((p) => p.kategori === activeFilter);

  async function handleDelete(pkg: Package) {
    if (!confirm(`Hapus paket "${pkg.namaPaket}"? Aksi ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/admin/packages?id=${pkg.id}`, { method: "DELETE" });
      const result = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(result.error ?? "Gagal menghapus paket");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      toast.success("Paket berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus paket");
    }
  }

  function handleEdit(pkg: Package) {
    setEditPackage(pkg);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditPackage(undefined);
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Packages Manager"
        title="Packages"
        subtitle="Kelola paket foto dan harga untuk klien Anda."
      >
        <button
          type="button"
          onClick={() => { setEditPackage(undefined); setShowModal(true); }}
          className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition min-h-[44px]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Paket
        </button>
      </PageHeader>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const count = tab.value === "ALL"
            ? packages.length
            : packages.filter((p) => p.kategori === tab.value).length;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveFilter(tab.value)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                activeFilter === tab.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {tab.label} {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Package List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="mt-3 text-sm font-medium text-slate-500">Belum ada paket</p>
          <p className="text-xs text-slate-400">Klik "Tambah Paket" untuk mulai</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pkg) => (
            <div key={pkg.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200">
              {/* Header card */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${KATEGORI_COLORS[pkg.kategori]}`}>
                    {KATEGORI_LABELS[pkg.kategori]}
                  </span>
                  <h3 className="font-semibold text-slate-900 text-sm leading-tight">{pkg.namaPaket}</h3>
                </div>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${pkg.status === "active" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}>
                  {pkg.status === "active" ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              {/* Harga */}
              <p className="text-xl font-bold text-slate-900 mb-2">{formatRupiah(Number(pkg.harga))}</p>

              {/* Detail */}
              <div className="space-y-1 text-xs text-slate-500 mb-4">
                <p>📷 Max seleksi: <span className="font-medium text-slate-700">{pkg.maxSelection} foto</span></p>
                {pkg.kuotaEdit && (
                  <p>✏️ {pkg.kuotaEdit} file diedit</p>
                )}
                {pkg.deskripsi && (
                  <p className="line-clamp-2">{pkg.deskripsi}</p>
                )}
                {pkg.includeCetak && pkg.includeCetak.length > 0 && (
                  <p>🖨️ Include cetak: {pkg.includeCetak.map((c) => `${c.nama} (${c.jumlah}pcs)`).join(", ")}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">{pkg._count.bookings} booking</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(pkg)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pkg)}
                    className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PackageModal pkg={editPackage} onClose={handleCloseModal} />
      )}
    </section>
  );
}

