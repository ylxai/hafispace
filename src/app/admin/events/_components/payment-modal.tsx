"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { formatRupiah } from "@/lib/format";

type PaymentType = "DP" | "PELUNASAN" | "LAINNYA";

interface Payment {
  id: string;
  jumlah: number;
  tipe: PaymentType;
  keterangan: string | null;
  buktiBayar: string | null;
  createdAt: string;
}

interface PaymentData {
  booking: {
    namaClient: string;
    kodeBooking: string;
    hargaPaket: number;
    dpAmount: number;
    dpStatus: string;
  };
  payments: Payment[];
  summary: {
    totalBayar: number;
    sisaTagihan: number;
    lunas: boolean;
  };
}

export function PaymentModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ jumlah: "", tipe: "DP" as "DP" | "PELUNASAN" | "LAINNYA", keterangan: "", buktiBayar: "" });
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useQuery<PaymentData>({
    queryKey: ["booking-payments", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments`);
      if (!res.ok) throw new Error("Gagal memuat data pembayaran");
      return res.json() as Promise<PaymentData>;
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.jumlah || Number(form.jumlah) <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, jumlah: Number(form.jumlah) }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Gagal menyimpan pembayaran");
        return;
      }
      toast.success("Pembayaran berhasil dicatat!");
      setForm({ jumlah: "", tipe: "DP", keterangan: "", buktiBayar: "" });
      await queryClient.invalidateQueries({ queryKey: ["booking-payments", bookingId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch {
      toast.error("Gagal menyimpan pembayaran");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(paymentId: string) {
    if (!confirm("Hapus catatan pembayaran ini?")) return;
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments?paymentId=${paymentId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Gagal menghapus pembayaran");
        return;
      }
      toast.success("Pembayaran dihapus");
      await queryClient.invalidateQueries({ queryKey: ["booking-payments", bookingId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch {
      toast.error("Gagal menghapus pembayaran");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Riwayat Pembayaran</h2>
            {data && <p className="text-xs text-slate-500">{data.booking.namaClient} · {data.booking.kodeBooking}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary */}
          {data && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Total Tagihan</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatRupiah(data.booking.hargaPaket)}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-green-500">Terbayar</p>
                <p className="mt-1 text-sm font-bold text-green-700">{formatRupiah(data.summary.totalBayar)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${data.summary.lunas ? "bg-green-50" : "bg-red-50"}`}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Sisa Tagihan</p>
                <p className={`mt-1 text-sm font-bold ${data.summary.lunas ? "text-green-700" : "text-red-600"}`}>
                  {data.summary.lunas ? "LUNAS ✓" : formatRupiah(data.summary.sisaTagihan)}
                </p>
              </div>
            </div>
          )}

          {/* History */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Riwayat</p>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : data?.payments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada pembayaran dicatat</p>
            ) : (
              <ul className="space-y-2">
                {data?.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          p.tipe === "DP" ? "bg-sky-100 text-sky-700" :
                          p.tipe === "PELUNASAN" ? "bg-green-100 text-green-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>{p.tipe}</span>
                        <span className="text-sm font-semibold text-slate-900">{formatRupiah(Number(p.jumlah))}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(p.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        {p.keterangan && ` · ${p.keterangan}`}
                        {p.buktiBayar && (
                          <>
                            {" · "}
                            <a
                              href={p.buktiBayar}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-600 hover:text-sky-700 font-medium"
                            >
                              Lihat Bukti
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Form Catat Pembayaran */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">+ Catat Pembayaran</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Jumlah (Rp) *</label>
                  <input
                    type="number"
                    value={form.jumlah}
                    onChange={(e) => setForm((f) => ({ ...f, jumlah: e.target.value }))}
                    placeholder="0"
                    min={1}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipe *</label>
                  <select
                    value={form.tipe}
                    onChange={(e) => setForm((f) => ({ ...f, tipe: e.target.value as "DP" | "PELUNASAN" | "LAINNYA" }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white"
                  >
                    <option value="DP">DP</option>
                    <option value="PELUNASAN">Pelunasan</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Transfer BCA, tunai, dll."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Link Bukti Transfer (opsional)</label>
                <input
                  type="url"
                  value={form.buktiBayar}
                  onChange={(e) => setForm((f) => ({ ...f, buktiBayar: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition"
              >
                {isSaving ? "Menyimpan..." : "Catat Pembayaran"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
