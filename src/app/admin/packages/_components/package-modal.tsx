"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";

export type PackageCategory = "PREWED" | "WEDDING" | "PERSONAL" | "EVENT" | "LAINNYA";

export interface IncludeCetak {
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

export function PackageModal({
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
              required
            >
              {Object.entries(KATEGORI_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Harga */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Harga (Rp) *</label>
            <input
              type="number"
              value={form.harga}
              onChange={(e) => setForm((f) => ({ ...f, harga: Number(e.target.value) }))}
              placeholder="0"
              min={0}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
              required
            />
          </div>

          {/* Max Selection & Kuota Edit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Seleksi</label>
              <input
                type="number"
                value={form.maxSelection}
                onChange={(e) => setForm((f) => ({ ...f, maxSelection: Number(e.target.value) }))}
                min={1}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kuota Edit</label>
              <input
                type="number"
                value={form.kuotaEdit}
                onChange={(e) => setForm((f) => ({ ...f, kuotaEdit: e.target.value }))}
                min={0}
                placeholder="Opsional"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Deskripsi</label>
            <textarea
              value={form.deskripsi}
              onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
              rows={3}
              placeholder="Deskripsi paket (opsional)"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 resize-none"
            />
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
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>

          {/* Include Cetak */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Include Cetak</label>
            {form.includeCetak.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {form.includeCetak.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-700">{item.nama} <span className="text-slate-400">×{item.jumlah}</span></span>
                    <button type="button" onClick={() => handleRemoveCetak(i)} className="text-red-400 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCetak.nama}
                onChange={(e) => setNewCetak((c) => ({ ...c, nama: e.target.value }))}
                placeholder="Nama cetak"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <input
                type="number"
                value={newCetak.jumlah}
                onChange={(e) => setNewCetak((c) => ({ ...c, jumlah: Number(e.target.value) }))}
                min={1}
                className="w-16 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <button type="button" onClick={handleAddCetak}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={isSaving}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
              {isSaving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Paket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
