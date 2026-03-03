"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700">{payload[0]?.payload?.namaPaket}</p>
      <p className="text-slate-500 mt-1">{payload[0]?.value} booking</p>
    </div>
  );
}

export function TopPackagesChart({ data }: { data: TopPackage[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Paket Terlaris</h2>
        <p className="text-xs text-slate-400">Top 5 berdasarkan booking</p>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">Belum ada data</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="namaPaket"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={110}
              tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + "…" : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="count" name="Booking" radius={[0, 6, 6, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={KATEGORI_COLORS[entry.kategori] ?? "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
