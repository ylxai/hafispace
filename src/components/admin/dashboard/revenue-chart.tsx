"use client";

import { formatRupiah, formatRupiahShort } from "@/lib/format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";

interface TrendData {
  bulan: string;
  pemasukan: number;
  dp: number;
  pelunasan: number;
}

interface TooltipPayload {
  dataKey?: string | number;
  name?: string | number;
  value?: number;
  color?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string> & { payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((entry: TooltipPayload) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-medium text-slate-800">{formatRupiah(entry.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: TrendData[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Tren Pemasukan</h2>
        <p className="text-xs text-slate-400">6 bulan terakhir</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorDP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="bulan"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            interval={0}
            padding={{ right: 8 }}
          />
          <YAxis tickFormatter={(v: number) => v === 0 ? "0" : formatRupiahShort(v)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={52} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) =>
              value === "pemasukan" ? "Total" : value === "dp" ? "DP" : "Pelunasan"
            }
          />
          <Area type="monotone" dataKey="pemasukan" name="pemasukan" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorPemasukan)" dot={false} />
          <Area type="monotone" dataKey="dp" name="dp" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#colorDP)" dot={false} strokeDasharray="4 2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
