import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { PrintButton } from "./print-button";
import { formatDate, formatRupiah } from "@/lib/format";


// ─── Types ─────────────────────────────────────────────────────────────────

interface Payment {
  id: string;
  jumlah: number;
  tipe: "DP" | "PELUNASAN" | "LAINNYA";
  keterangan: string | null;
  createdAt: string;
}

interface InvoiceData {
  booking: {
    id: string;
    kodeBooking: string;
    namaClient: string;
    hpClient: string;
    emailClient: string | null;
    tanggalSesi: string;
    lokasiSesi: string | null;
    status: string;
    hargaPaket: number;
    dpAmount: number;
    dpStatus: string;
    notes: string | null;
    createdAt: string;
    paket: {
      namaPaket: string;
      kategori: string;
      kuotaEdit: number | null;
      includeCetak: Array<{ nama: string; jumlah: number }> | null;
      deskripsi: string | null;
    } | null;
    payments: Payment[];
    vendor: {
      namaStudio: string | null;
      logoUrl: string | null;
      phone: string | null;
      email: string | null;
      rekeningPembayaran: string | null;
      themeColor: string;
      dpPercentage: number;
    };
  };
  summary: {
    totalBayar: number;
    sisaTagihan: number;
    lunas: boolean;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu Konfirmasi",
  CONFIRMED: "Dikonfirmasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-100 text-red-500",
};

const TIPE_LABELS: Record<string, string> = {
  DP: "Down Payment",
  PELUNASAN: "Pelunasan",
  LAINNYA: "Pembayaran",
};

// ─── Data Fetching ───────────────────────────────────────────────────────────

async function getInvoice(kodeBooking: string): Promise<InvoiceData | null> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/public/invoice/${kodeBooking}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<InvoiceData>;
  } catch {
    return null;
  }
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kodeBooking: string }>;
}): Promise<Metadata> {
  const { kodeBooking } = await params;
  return {
    title: `Invoice ${kodeBooking} | Hafispace`,
    description: `Invoice booking photography ${kodeBooking}`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ kodeBooking: string }>;
}) {
  const { kodeBooking } = await params;
  const data = await getInvoice(kodeBooking);

  if (!data) notFound();

  const { booking, summary } = data;
  const { vendor } = booking;
  const theme = vendor.themeColor ?? "#0f172a";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 print:bg-white print:py-0 print:px-0">
      <div className="mx-auto max-w-2xl">

        {/* Print button — hidden saat print */}
        <div className="mb-4 flex justify-end print:hidden">
          <PrintButton />
        </div>

        {/* Invoice Card */}
        <div className="rounded-2xl bg-white shadow-sm print:shadow-none print:rounded-none">

          {/* Header */}
          <div className="border-b border-slate-100 px-8 py-6" style={{ borderTopColor: theme, borderTopWidth: 4 }}>
            <div className="flex items-start justify-between">
              <div>
                {vendor.logoUrl && (
                  <Image
                    src={vendor.logoUrl}
                    alt={vendor.namaStudio ?? "Studio"}
                    width={120}
                    height={48}
                    className="mb-2 h-12 w-auto object-contain"
                  />
                )}
                <h1 className="text-lg font-bold text-slate-900">
                  {vendor.namaStudio ?? "Photography Studio"}
                </h1>
                {vendor.phone && (
                  <p className="text-xs text-slate-500">{vendor.phone}</p>
                )}
                {vendor.email && (
                  <p className="text-xs text-slate-500">{vendor.email}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Invoice</p>
                <p className="text-xl font-bold text-slate-900 font-mono">{booking.kodeBooking}</p>
                <p className="mt-1 text-xs text-slate-500">Dibuat: {formatDate(booking.createdAt)}</p>
                <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[booking.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABELS[booking.status] ?? booking.status}
                </span>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">

            {/* Client & Sesi */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Data Klien</p>
                <p className="font-semibold text-slate-800">{booking.namaClient}</p>
                <p className="text-sm text-slate-500">{booking.hpClient}</p>
                {booking.emailClient && (
                  <p className="text-sm text-slate-500">{booking.emailClient}</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Detail Sesi</p>
                <p className="font-semibold text-slate-800">{formatDate(booking.tanggalSesi)}</p>
                {booking.lokasiSesi && (
                  <p className="text-sm text-slate-500">{booking.lokasiSesi}</p>
                )}
              </div>
            </div>

            {/* Paket */}
            {booking.paket && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Paket</p>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{booking.paket.namaPaket}</p>
                    <p className="text-xs text-slate-500">{booking.paket.kategori}</p>
                    {booking.paket.kuotaEdit && (
                      <p className="text-xs text-slate-500">✏️ {booking.paket.kuotaEdit} file diedit</p>
                    )}
                    {booking.paket.includeCetak && booking.paket.includeCetak.length > 0 && (
                      <p className="text-xs text-slate-500">
                        🖨️ {booking.paket.includeCetak.map((c) => `${c.nama} (${c.jumlah}pcs)`).join(", ")}
                      </p>
                    )}
                    {booking.paket.deskripsi && (
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">{booking.paket.deskripsi}</p>
                    )}
                  </div>
                  <p className="shrink-0 font-bold text-slate-900">{formatRupiah(booking.hargaPaket)}</p>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Rincian Pembayaran</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 text-slate-600">Harga Paket</td>
                    <td className="py-2 text-right font-semibold text-slate-800">{formatRupiah(booking.hargaPaket)}</td>
                  </tr>
                  {booking.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 text-slate-500">
                        <span className="font-medium text-slate-700">{TIPE_LABELS[p.tipe]}</span>
                        <span className="ml-2 text-xs text-slate-400">({formatDate(p.createdAt)})</span>
                        {p.keterangan && <span className="ml-1 text-xs text-slate-400">· {p.keterangan}</span>}
                      </td>
                      <td className="py-2 text-right text-green-600 font-medium">- {formatRupiah(p.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td className="pt-3 font-semibold text-slate-700">Total Terbayar</td>
                    <td className="pt-3 text-right font-bold text-green-600">{formatRupiah(summary.totalBayar)}</td>
                  </tr>
                  <tr>
                    <td className="pt-2 font-bold text-slate-800">Sisa Tagihan</td>
                    <td className={`pt-2 text-right text-lg font-bold ${summary.lunas ? "text-green-600" : "text-red-600"}`}>
                      {summary.lunas ? "✓ LUNAS" : formatRupiah(summary.sisaTagihan)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Rekening Pembayaran */}
            {vendor.rekeningPembayaran && !summary.lunas && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500">Rekening Pembayaran</p>
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{vendor.rekeningPembayaran}</pre>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-slate-100 pt-4 text-center">
              <p className="text-xs text-slate-400">
                Terima kasih telah mempercayakan momen berharga Anda kepada{" "}
                <span className="font-medium text-slate-600">{vendor.namaStudio ?? "kami"}</span>.
              </p>
              <p className="mt-1 text-[10px] text-slate-300">Powered by Hafispace</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
