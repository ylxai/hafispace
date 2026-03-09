import { formatRupiah } from "@/lib/format";
interface Overview {
  totalBookings: number;
  bookingsBulanIni: number;
  totalClients: number;
  totalOmset: number;
  pemasukanBulanIni: number;
  dpBulanIni: number;
}

const cards = (o: Overview) => [
  {
    label: "Total Omset",
    value: formatRupiah(o.totalOmset),
    sub: `Bulan ini: ${formatRupiah(o.pemasukanBulanIni)}`,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "DP Bulan Ini",
    value: formatRupiah(o.dpBulanIni),
    sub: `Total pemasukan: ${formatRupiah(o.pemasukanBulanIni)}`,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    label: "Booking Bulan Ini",
    value: o.bookingsBulanIni,
    sub: `Total: ${o.totalBookings} booking`,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    label: "Total Klien",
    value: o.totalClients,
    sub: "Klien terdaftar",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export function MetricsCards({ overview }: { overview: Overview }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards(overview).map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
            <span className={`rounded-xl p-2 ${card.bg} ${card.color}`}>{card.icon}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</p>
          <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
