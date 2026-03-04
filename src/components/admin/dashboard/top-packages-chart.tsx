"use client";

interface TopPackage {
  paketId: string | null;
  count: number;
  namaPaket: string;
  kategori: string;
}

const KATEGORI_COLORS: Record<string, string> = {
  PREWED: "#f472b6",
  WEDDING: "#a78bfa",
  PERSONAL: "#38bdf8",
  EVENT: "#fbbf24",
  LAINNYA: "#94a3b8",
};


export function TopPackagesChart({ data }: { data: TopPackage[] }) {
  // Jika tidak ada data, tampilkan empty state
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Paket Terlaris</h2>
          <p className="text-xs text-slate-400">Top 5 berdasarkan booking</p>
        </div>
        <p className="py-12 text-center text-sm text-slate-400">Belum ada data</p>
      </div>
    );
  }

  // Gunakan custom bar list (bukan recharts) agar warna 100% reliable
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">Paket Terlaris</h2>
        <p className="text-xs text-slate-400">Top 5 berdasarkan booking</p>
      </div>

      {/* Recharts hanya untuk chart yang perlu animasi — gunakan custom bar list */}
      <div className="space-y-3">
        {data.map((item, index) => {
          const color = KATEGORI_COLORS[item.kategori] ?? "#94a3b8";
          const pct = Math.max((item.count / maxCount) * 100, 4);
          return (
            <div key={item.paketId ?? index}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700 truncate max-w-[70%]">
                  {item.namaPaket}
                </span>
                <span className="text-xs font-bold text-slate-900 ml-2 shrink-0">
                  {item.count} booking
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend kategori */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {Object.entries(KATEGORI_COLORS).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c }} />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{k}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
