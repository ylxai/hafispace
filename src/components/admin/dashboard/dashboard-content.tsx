"use client";

import { useQuery } from "@tanstack/react-query";
import { MetricsCards } from "./metrics-cards";
import { RevenueChart } from "./revenue-chart";
import { TopPackagesChart } from "./top-packages-chart";
import { SessionCalendar } from "./session-calendar";
import { RecentBookings } from "./recent-bookings";

interface MetricsData {
  overview: {
    totalBookings: number;
    bookingsBulanIni: number;
    totalClients: number;
    totalOmset: number;
    pemasukanBulanIni: number;
    dpBulanIni: number;
  };
  topPackages: Array<{
    paketId: string | null;
    count: number;
    namaPaket: string;
    kategori: string;
  }>;
  upcomingSessions: Array<{
    id: string;
    namaClient: string;
    tanggalSesi: string | null;
    status: string;
    namaPaket: string | null;
  }>;
  recentBookings: Array<{
    id: string;
    kodeBooking: string;
    namaClient: string;
    status: string;
    tanggalSesi: string | null;
    hargaPaket: number;
    dpStatus: string;
    createdAt: string;
    namaPaket: string | null;
  }>;
  trendData: Array<{
    bulan: string;
    pemasukan: number;
    dp: number;
    pelunasan: number;
  }>;
}

function SkeletonCard() {
  return <div className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />;
}

function SkeletonChart() {
  return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />;
}

export function DashboardContent() {
  const { data, isLoading, isError } = useQuery<MetricsData>({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) throw new Error("Gagal memuat data dashboard");
      return res.json() as Promise<MetricsData>;
    },
    staleTime: 60_000, // 1 menit
    refetchOnWindowFocus: false,
  });

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-600">Gagal memuat data dashboard</p>
        <p className="text-xs text-red-400 mt-1">Coba refresh halaman</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Metric Cards */}
      <MetricsCards overview={data.overview} />

      {/* Charts Row */}
      <div className="grid gap-5 lg:grid-cols-2">
        <RevenueChart data={data.trendData} />
        <TopPackagesChart data={data.topPackages} />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <SessionCalendar sessions={data.upcomingSessions} />
        <RecentBookings bookings={data.recentBookings} />
      </div>
    </div>
  );
}
