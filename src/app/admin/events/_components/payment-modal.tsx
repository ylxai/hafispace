"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { formatRupiah } from "@/lib/format";
import { z } from "zod";

type PaymentType = "DP" | "PELUNASAN" | "LAINNYA";

const paymentSchema = z.object({
  jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  tipe: z.enum(["DP", "PELUNASAN", "LAINNYA"]).default("DP"),
  keterangan: z.string().optional(),
  buktiBayar: z
    .string()
    .url("Link bukti transfer harus berupa URL yang valid")
    .refine(
      (url) => url.startsWith("https://res.cloudinary.com/"),
      "Bukti transfer harus diupload melalui sistem (Cloudinary URL)"
    ),
});

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const { data, isLoading } = useQuery<PaymentData>({
    queryKey: ["booking-payments", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments`);
      if (!res.ok) throw new Error("Gagal memuat data pembayaran");
      return res.json() as Promise<PaymentData>;
    },
  });

  async function handleFileUpload(file: File) {
    setIsUploading(true);
    // Revoke URL lama sebelum membuat yang baru untuk mencegah memory leak
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Gagal upload bukti");
        if (previewObjectUrlRef.current) {
          URL.revokeObjectURL(previewObjectUrlRef.current);
          previewObjectUrlRef.current = null;
        }
        setPreviewUrl(null);
        return;
      }
      const { url } = await res.json() as { url: string };
      setForm((f) => ({ ...f, buktiBayar: url }));
    } catch {
      toast.error("Gagal upload bukti transfer");
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  }

  function validateField(field: keyof typeof form, value: string | number) {
    try {
      paymentSchema.shape[field].parse(value);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const firstIssue = err.issues[0];
        if (firstIssue) {
          setErrors((prev) => ({ ...prev, [field]: firstIssue.message }));
        }
      }
    }
  }

  function handleFieldChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      validateField(field, field === "jumlah" ? Number(value) : value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationResult = paymentSchema.safeParse(form);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] ??= issue.message;
      });
      setErrors(fieldErrors);
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
      setErrors({});
      // Revoke object URL setelah berhasil submit
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        {/* Handle bar for mobile indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Riwayat Pembayaran</h2>
            {data && <p className="text-xs text-slate-500">{data.booking.namaClient} · {data.booking.kodeBooking}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 -mr-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 pt-4 flex-1 space-y-5">
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
                  <li key={p.id} className="rounded-xl border border-slate-100 px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
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
                    </div>
                    {p.buktiBayar && (
                      <a href={p.buktiBayar} target="_blank" rel="noopener noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.buktiBayar}
                          alt="Bukti transfer"
                          className="w-full max-h-48 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity cursor-zoom-in"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = "none";
                            const fallback = target.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = "inline-flex";
                          }}
                        />
                        <span
                          style={{ display: "none" }}
                          className="items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium mt-1"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Lihat Bukti
                        </span>
                      </a>
                    )}
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
                    onChange={(e) => handleFieldChange("jumlah", e.target.value)}
                    onBlur={(e) => validateField("jumlah", Number(e.target.value))}
                    placeholder="0"
                    min={1}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400 ${
                      errors.jumlah ? "border-red-300 bg-red-50" : "border-slate-200"
                    }`}
                  />
                  {errors.jumlah && <p className="mt-1 text-xs text-red-600">{errors.jumlah}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipe *</label>
                  <select
                    value={form.tipe}
                    onChange={(e) => handleFieldChange("tipe", e.target.value)}
                    onBlur={(e) => validateField("tipe", e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400 bg-white ${
                      errors.tipe ? "border-red-300 bg-red-50" : "border-slate-200"
                    }`}
                  >
                    <option value="DP">DP</option>
                    <option value="PELUNASAN">Pelunasan</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                  {errors.tipe && <p className="mt-1 text-xs text-red-600">{errors.tipe}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) => handleFieldChange("keterangan", e.target.value)}
                  placeholder="Transfer BCA, tunai, dll."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bukti Transfer *</label>
                <div
                  className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                    errors.buktiBayar
                      ? "border-red-300 bg-red-50"
                      : previewUrl
                      ? "border-green-300 bg-green-50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFileUpload(file);
                    }}
                  />
                  {previewUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Preview bukti"
                        className="w-full max-h-40 object-cover rounded-xl"
                      />
                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                          <span className="text-white text-xs font-medium">Mengupload...</span>
                        </div>
                      )}
                      {!isUploading && form.buktiBayar && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ✓ Terupload
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 gap-1">
                      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span className="text-xs text-slate-500">Tap untuk upload foto bukti transfer</span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, WEBP · Maks 5MB</span>
                    </div>
                  )}
                </div>
                {errors.buktiBayar && <p className="mt-1 text-xs text-red-600">{errors.buktiBayar}</p>}
                {previewUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (previewObjectUrlRef.current) {
                        URL.revokeObjectURL(previewObjectUrlRef.current);
                        previewObjectUrlRef.current = null;
                      }
                      setPreviewUrl(null);
                      setForm((f) => ({ ...f, buktiBayar: "" }));
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.buktiBayar;
                        return next;
                      });
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="mt-1 text-xs text-red-500 hover:text-red-600"
                  >
                    × Hapus foto
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSaving || isUploading || Object.keys(errors).length > 0 || !form.jumlah || !form.buktiBayar}
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
