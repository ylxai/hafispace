"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface PackageOption {
  id: string;
  namaPaket: string;
  kategori: string;
  harga: number;
}

export function CreateBookingModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [hargaPaket, setHargaPaket] = useState<string>("");

  const { data: packagesData } = useQuery<{ packages: PackageOption[] }>({
    queryKey: ['admin-packages'],
    queryFn: async () => {
      const res = await fetch('/api/admin/packages');
      return res.json();
    },
    staleTime: 60_000,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const form = e.currentTarget;
    const tanggalSesiValue = (form.elements.namedItem("tanggalSesi") as HTMLInputElement).value;
    
    // Fix timezone: Parse date in user's local timezone, then convert to UTC
    const sessionDate = new Date(tanggalSesiValue);
    // Set to noon to avoid timezone edge cases
    sessionDate.setHours(12, 0, 0, 0);
    
    const paketIdValue = (form.elements.namedItem("paketId") as HTMLSelectElement).value;
    const paketCustomValue = (form.elements.namedItem("paketCustom") as HTMLInputElement).value;
    const hargaPaketValue = (form.elements.namedItem("hargaPaket") as HTMLInputElement).value;

    const data = {
      namaClient: (form.elements.namedItem("namaClient") as HTMLInputElement).value,
      hpClient: (form.elements.namedItem("hpClient") as HTMLInputElement).value,
      emailClient: (form.elements.namedItem("emailClient") as HTMLInputElement).value || undefined,
      tanggalSesi: sessionDate.toISOString(),
      lokasiSesi: (form.elements.namedItem("lokasiSesi") as HTMLInputElement).value,
      paketId: paketIdValue || undefined,
      paketCustom: paketCustomValue || undefined,
      hargaPaket: hargaPaketValue ? parseFloat(hargaPaketValue) : undefined,
      maxSelection: parseInt((form.elements.namedItem("maxSelection") as HTMLSelectElement).value),
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value || undefined,
    };

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
                      }
                    } else {
                      setHargaPaket("");
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
                  onChange={(e) => setHargaPaket(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="maxSelection">
                  Max Selections *
                </label>
                <select
                  id="maxSelection"
                  name="maxSelection"
                  required
                  defaultValue="40"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
                >
                  <option value="40">40 photos</option>
                  <option value="80">80 photos</option>
                  <option value="120">120 photos</option>
                  <option value="160">160 photos</option>
                  <option value="200">200 photos</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
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
              disabled={isSubmitting}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
