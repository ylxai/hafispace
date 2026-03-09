"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingSchema } from "@/lib/api/validation";
import { z } from "zod";

interface PackageOption {
  id: string;
  namaPaket: string;
  kategori: string;
  harga: number;
  maxSelection: number;
}

export function CreateBookingModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [hargaPaket, setHargaPaket] = useState<string>("");
  const [maxSelection, setMaxSelection] = useState<number>(40);
  const [formData, setFormData] = useState({
    namaClient: "",
    hpClient: "",
    emailClient: "",
    tanggalSesi: "",
    lokasiSesi: "",
    paketCustom: "",
    notes: "",
  });

  const { data: packagesData } = useQuery<{ packages: PackageOption[] }>({
    queryKey: ['admin-packages'],
    queryFn: async () => {
      const res = await fetch('/api/admin/packages');
      return res.json();
    },
    staleTime: 60_000,
  });

  function validateField(name: string, value: string | number) {
    const fieldSchema = bookingSchema.shape[name as keyof typeof bookingSchema.shape];
    if (!fieldSchema) return;

    try {
      if (name === "tanggalSesi" && value) {
        const selectedDate = new Date(value as string);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          setErrors(prev => ({ ...prev, [name]: "Session date cannot be in the past" }));
          return;
        }
      }

      if (name === "hargaPaket" && value !== "") {
        const numValue = parseFloat(value as string);
        if (isNaN(numValue) || numValue < 0) {
          setErrors(prev => ({ ...prev, [name]: "Price must be a positive number" }));
          return;
        }
      }

      fieldSchema.parse(value);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [name]: err.issues[0]?.message ?? "Invalid value" }));
      }
    }
  }

  function handleFieldChange(name: string, value: string) {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      validateField(name, value);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const form = e.currentTarget;
    const tanggalSesiValue = (form.elements.namedItem("tanggalSesi") as HTMLInputElement).value;
    const paketIdValue = (form.elements.namedItem("paketId") as HTMLSelectElement).value;
    const paketCustomValue = (form.elements.namedItem("paketCustom") as HTMLInputElement).value;
    const hargaPaketValue = (form.elements.namedItem("hargaPaket") as HTMLInputElement).value;

    // Fix timezone: Parse date in user's local timezone, then convert to UTC
    const sessionDate = new Date(tanggalSesiValue);
    // Set to noon to avoid timezone edge cases
    sessionDate.setHours(12, 0, 0, 0);

    const data = {
      namaClient: (form.elements.namedItem("namaClient") as HTMLInputElement).value,
      hpClient: (form.elements.namedItem("hpClient") as HTMLInputElement).value,
      emailClient: (form.elements.namedItem("emailClient") as HTMLInputElement).value || undefined,
      tanggalSesi: sessionDate.toISOString(),
      lokasiSesi: (form.elements.namedItem("lokasiSesi") as HTMLInputElement).value,
      paketId: paketIdValue || undefined,
      paketCustom: paketCustomValue || undefined,
      hargaPaket: hargaPaketValue ? parseFloat(hargaPaketValue) : undefined,
      maxSelection: parseInt((form.elements.namedItem("maxSelection") as HTMLInputElement).value),
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value || undefined,
    };

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.details) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, val] of Object.entries(err.details as Record<string, { _errors: string[] }>)) {
            if (val._errors?.length) fieldErrors[key] = val._errors[0] ?? "";
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ form: err.message ?? "Failed to create booking" });
        }
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      onClose();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        {/* Handle bar for mobile indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {/* Header Fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">Create New Booking</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 -mr-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          {errors.form && (
            <div className="px-6 pt-4">
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{errors.form}</p>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-6 pt-4 flex-1">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="namaClient">
                    Client Name *
                  </label>
                  <input
                    id="namaClient"
                    name="namaClient"
                    type="text"
                    required
                    value={formData.namaClient}
                    onChange={(e) => handleFieldChange("namaClient", e.target.value)}
                    onBlur={(e) => validateField("namaClient", e.target.value)}
                    placeholder="e.g. Ridwan & Maya"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  {errors.namaClient && <p className="mt-1 text-xs text-red-500">{errors.namaClient}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="hpClient">
                    Phone *
                  </label>
                  <input
                    id="hpClient"
                    name="hpClient"
                    type="tel"
                    required
                    value={formData.hpClient}
                    onChange={(e) => handleFieldChange("hpClient", e.target.value)}
                    onBlur={(e) => validateField("hpClient", e.target.value)}
                    placeholder="+6281234567890"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  {errors.hpClient && <p className="mt-1 text-xs text-red-500">{errors.hpClient}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="emailClient">
                  Email
                </label>
                <input
                  id="emailClient"
                  name="emailClient"
                  type="email"
                  value={formData.emailClient}
                  onChange={(e) => handleFieldChange("emailClient", e.target.value)}
                  onBlur={(e) => e.target.value && validateField("emailClient", e.target.value)}
                  placeholder="client@example.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                />
                {errors.emailClient && <p className="mt-1 text-xs text-red-500">{errors.emailClient}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="tanggalSesi">
                    Session Date *
                  </label>
                  <input
                    id="tanggalSesi"
                    name="tanggalSesi"
                    type="date"
                    required
                    value={formData.tanggalSesi}
                    onChange={(e) => handleFieldChange("tanggalSesi", e.target.value)}
                    onBlur={(e) => validateField("tanggalSesi", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  {errors.tanggalSesi && <p className="mt-1 text-xs text-red-500">{errors.tanggalSesi}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="lokasiSesi">
                    Location *
                  </label>
                  <input
                    id="lokasiSesi"
                    name="lokasiSesi"
                    type="text"
                    required
                    value={formData.lokasiSesi}
                    onChange={(e) => handleFieldChange("lokasiSesi", e.target.value)}
                    onBlur={(e) => validateField("lokasiSesi", e.target.value)}
                    placeholder="e.g. Gedung Serbaguna"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  {errors.lokasiSesi && <p className="mt-1 text-xs text-red-500">{errors.lokasiSesi}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="paketId">
                  Pilih Paket
                </label>
                <select
                  id="paketId"
                  name="paketId"
                  value={selectedPackageId}
                  onChange={(e) => {
                    const pkgId = e.target.value;
                    setSelectedPackageId(pkgId);
                    if (pkgId) {
                      const pkg = packagesData?.packages.find(p => p.id === pkgId);
                      if (pkg) {
                        setHargaPaket(pkg.harga.toString());
                        setMaxSelection(pkg.maxSelection);
                      }
                    } else {
                      setHargaPaket("");
                      setMaxSelection(40);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 bg-white"
                >
                  <option value="">-- Pilih Paket --</option>
                  {packagesData?.packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.namaPaket} — Rp {new Intl.NumberFormat('id-ID').format(pkg.harga)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="paketCustom">
                  Atau Nama Paket Custom
                </label>
                <input
                  id="paketCustom"
                  name="paketCustom"
                  type="text"
                  value={formData.paketCustom}
                  onChange={(e) => handleFieldChange("paketCustom", e.target.value)}
                  placeholder="e.g. Wedding Full Day (opsional)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="hargaPaket">
                  Harga Paket (Rp)
                </label>
                <input
                  id="hargaPaket"
                  name="hargaPaket"
                  type="number"
                  value={hargaPaket}
                  onChange={(e) => {
                    setHargaPaket(e.target.value);
                    if (errors.hargaPaket) {
                      validateField("hargaPaket", e.target.value);
                    }
                  }}
                  onBlur={(e) => e.target.value && validateField("hargaPaket", e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                />
                {errors.hargaPaket && <p className="mt-1 text-xs text-red-500">{errors.hargaPaket}</p>}
              </div>

              {/* maxSelection — dari paket, tampilkan sebagai info */}
              <input type="hidden" name="maxSelection" value={maxSelection} />
              {selectedPackageId && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-center gap-3">
                  <svg className="h-4 w-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-700">
                    Paket ini memiliki batas seleksi <span className="font-semibold">{maxSelection} foto</span>. Dapat diubah di halaman Paket.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleFieldChange("notes", e.target.value)}
                  placeholder="Additional notes..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                />
                {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes}</p>}
              </div>
            </div>
          </div>

          {/* Fixed Footer Form Button */}
          <div className="flex justify-end gap-3 p-6 pt-4 border-t border-slate-100 bg-white rounded-b-2xl shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(errors).length > 0 || !formData.namaClient || !formData.hpClient || !formData.tanggalSesi || !formData.lokasiSesi}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
