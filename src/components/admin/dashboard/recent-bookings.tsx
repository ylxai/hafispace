import Link from "next/link";
import { formatRupiah } from "@/lib/format";


interface RecentBooking {
  id: string;
  kodeBooking: string;
  namaClient: string;
  status: string;
  tanggalSesi: string | null;
  hargaPaket: number;
  dpStatus: string;
  createdAt: string;
  namaPaket: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-100 text-red-500",
};

const DP_STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-sky-100 text-sky-700",
  UNPAID: "bg-slate-100 text-slate-500",
};

const DP_STATUS_LABELS: Record<string, string> = {
  PAID: "Lunas",
  PARTIAL: "Partial",
  UNPAID: "Belum Bayar",
};

export function RecentBookings({ bookings }: { bookings: RecentBooking[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Booking Terbaru</h2>
          <p className="text-xs text-slate-400">5 booking terakhir masuk</p>
        </div>
        <Link href="/admin/events" className="text-xs font-medium text-sky-600 hover:text-sky-700">
          Lihat semua →
        </Link>
      </div>

      {bookings.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Belum ada booking</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {bookings.map((booking) => (
            <li key={booking.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-slate-800 truncate">{booking.namaClient}</p>
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[booking.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 font-mono truncate max-w-[120px]">{booking.kodeBooking}</p>
                    {booking.namaPaket && (
                      <p className="text-xs text-slate-400 truncate">· {booking.namaPaket}</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-800">{formatRupiah(booking.hargaPaket)}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${DP_STATUS_COLORS[booking.dpStatus] ?? "bg-slate-100 text-slate-500"}`}>
                    {DP_STATUS_LABELS[booking.dpStatus] ?? booking.dpStatus}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
