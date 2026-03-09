"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { formatRupiah } from "@/lib/format";


type PackageCategory = "PREWED" | "WEDDING" | "PERSONAL" | "EVENT" | "LAINNYA";

interface IncludeCetak {
  nama: string;
  jumlah: number;
}

interface Package {
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

const KATEGORI_LABELS: Record<PackageCategory, string> = {
  PREWED: "Prewedding",
  WEDDING: "Wedding",
  PERSONAL: "Personal",
  EVENT: "Event",
  LAINNYA: "Lainnya",
};

const KATEGORI_COLORS: Record<PackageCategory, string> = {
  PREWED: "bg-pink-100 text-pink-700",
  WEDDING: "bg-purple-100 text-purple-700",
  PERSONAL: "bg-sky-100 text-sky-700",
  EVENT: "bg-amber-100 text-amber-700",
  LAINNYA: "bg-slate-100 text-slate-600",
};

const FILTER_TABS: { label: string; value: PackageCategory | "ALL" }[] = [
  { label: "Semua", value: "ALL" },
  { label: "Prewedding", value: "PREWED" },
  { label: "Wedding", value: "WEDDING" },
  { label: "Personal", value: "PERSONAL" },
  { label: "Event", value: "EVENT" },
  { label: "Lainnya", value: "LAINNYA" },
];


function PackageModal({
  pkg,
  onClose,
}: {
  pkg?: Package;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = !!pkg;

  const [form, setForm] = useState({
    namaPaket: pkg?.namaPaket ?? "",
    kategori: pkg?.kategori ?? ("LAINNYA" as PackageCategory),
    harga: pkg?.harga ?? 0,
    deskripsi: pkg?.deskripsi ?? "",
    kuotaEdit: pkg?.kuotaEdit ?? ("" as string | number),
    maxSelection: pkg?.maxSelection ?? 40,
    status: pkg?.status ?? "active",
    includeCetak: (pkg?.includeCetak ?? []) as IncludeCetak[],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [newCetak, setNewCetak] = useState({ nama: "", jumlah: 1 });

  const mutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const res = await fetch("/api/admin/packages", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          id: pkg?.id,
          kuotaEdit: data.kuotaEdit === "" ? null : Number(data.kuotaEdit),
          includeCetak: data.includeCetak.length > 0 ? data.includeCetak : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Gagal menyimpan paket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      toast.success(isEdit ? "Paket berhasil diperbarui!" : "Paket berhasil ditambahkan!");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function handleAddCetak() {
    if (!newCetak.nama) return;
    setForm((f) => ({ ...f, includeCetak: [...f.includeCetak, { ...newCetak }] }));
    setNewCetak({ nama: "", jumlah: 1 });
  }

  function handleRemoveCetak(index: number) {
    setForm((f) => ({ ...f, includeCetak: f.includeCetak.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await mutation.mutateAsync(form);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? "Edit Paket" : "Tambah Paket Baru"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nama Paket */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Paket *</label>
            <input
              type="text"
              value={form.namaPaket}
              onChange={(e) => setForm((f) => ({ ...f, namaPaket: e.target.value }))}
              placeholder="Contoh: WEDDING - All In"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
              required
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kategori *</label>
            <select
              value={form.kategori}
              onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value as PackageCategory }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 bg-white"
            >
              {Object.entries(KATEGORI_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Harga & Kuota Edit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Harga (Rp) *</label>
              <input
                type="number"
                value={form.harga}
                onChange={(e) => setForm((f) => ({ ...f, harga: Number(e.target.value) }))}
                min={0}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kuota Edit (file)</label>
              <input
                type="number"
                value={form.kuotaEdit}
                onChange={(e) => setForm((f) => ({ ...f, kuotaEdit: e.target.value }))}
                min={1}
                placeholder="Opsional"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Seleksi Foto</label>
              <input
                type="number"
                value={form.maxSelection}
                onChange={(e) => setForm((f) => ({ ...f, maxSelection: Number(e.target.value) }))}
                min={1}
                placeholder="40"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
              />
              <p className="mt-1 text-[10px] text-slate-400">Jumlah foto yang bisa dipilih klien di galeri</p>
            </div>
          </div>

          {/* Deskripsi / Benefit */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Benefit & Deskripsi</label>
            <textarea
              value={form.deskripsi ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
              placeholder="Contoh: Max 2 jam sesi, unlimited shoot, semua file dikirim..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 resize-none"
            />
          </div>

          {/* Include Cetak */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Include Cetak</label>
            {form.includeCetak.length > 0 && (
              <ul className="mb-2 space-y-1">
                {form.includeCetak.map((item, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{item.nama}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{item.jumlah} pcs</span>
                      <button type="button" onClick={() => handleRemoveCetak(i)} className="text-red-400 hover:text-red-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {/* Stack vertikal di mobile agar tidak terpotong */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={newCetak.nama}
                onChange={(e) => setNewCetak((n) => ({ ...n, nama: e.target.value }))}
                placeholder="Ukuran (cth: 4R)"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newCetak.jumlah}
                  onChange={(e) => setNewCetak((n) => ({ ...n, jumlah: Number(e.target.value) }))}
                  min={1}
                  placeholder="Qty"
                  className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAddCetak}
                  className="flex-1 sm:flex-none rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                >
                  + Tambah
                </button>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 bg-white"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Paket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-500 to-sky-700" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Packages Manager</p>
            <p className="mt-0.5 text-sm text-slate-500">Kelola paket foto dan harga untuk klien Anda.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setEditPackage(undefined); setShowModal(true); }}
          className="self-start flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition min-h-[44px]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Paket
        </button>
      </header>

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

