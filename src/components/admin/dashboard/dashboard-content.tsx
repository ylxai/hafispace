import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { MetricsCards } from "./metrics-cards";
import { RevenueChart } from "./revenue-chart";
import { TopPackagesChart } from "./top-packages-chart";
import { SessionCalendar } from "./session-calendar";
import { RecentBookings } from "./recent-bookings";

/**
 * Critical data — above the fold: metrics, recent bookings, upcoming sessions.
 * Render pertama kali sebelum charts.
 */
async function getCriticalData(vendorId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalBookings,
    bookingsBulanIni,
    totalClients,
    totalOmsetAgg,
    pemasukanBulanIniAgg,
    dpBulanIniAgg,
    upcomingSessions,
    recentBookings,
  ] = await Promise.all([
    prisma.booking.count({ where: { vendorId } }),
    prisma.booking.count({ where: { vendorId, createdAt: { gte: startOfMonth } } }),
    prisma.client.count({ where: { bookings: { some: { vendorId } } } }),
    prisma.payment.aggregate({ where: { booking: { vendorId } }, _sum: { jumlah: true } }),
    prisma.payment.aggregate({
      where: { booking: { vendorId }, createdAt: { gte: startOfMonth } },
      _sum: { jumlah: true },
    }),
    prisma.payment.aggregate({
      where: { booking: { vendorId }, createdAt: { gte: startOfMonth }, tipe: "DP" },
      _sum: { jumlah: true },
    }),
    prisma.booking.findMany({
      where: { vendorId, tanggalSesi: { gte: startOfMonth }, status: { not: "CANCELLED" } },
      select: {
        id: true, namaClient: true, tanggalSesi: true, status: true,
        paket: { select: { namaPaket: true } },
      },
      orderBy: { tanggalSesi: "asc" },
      take: 5,
    }),
    prisma.booking.findMany({
      where: { vendorId },
      select: {
        id: true, kodeBooking: true, namaClient: true, status: true,
        tanggalSesi: true, hargaPaket: true, dpStatus: true, createdAt: true,
        paket: { select: { namaPaket: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    overview: {
      totalBookings,
      bookingsBulanIni,
      totalClients,
      totalOmset: Number(totalOmsetAgg._sum.jumlah ?? 0),
      pemasukanBulanIni: Number(pemasukanBulanIniAgg._sum.jumlah ?? 0),
      dpBulanIni: Number(dpBulanIniAgg._sum.jumlah ?? 0),
    },
    upcomingSessions: upcomingSessions.map((s) => ({
      id: s.id,
      namaClient: s.namaClient,
      tanggalSesi: s.tanggalSesi?.toISOString() ?? null,
      status: s.status,
      namaPaket: s.paket?.namaPaket ?? null,
    })),
    recentBookings: recentBookings.map((b) => ({
      id: b.id,
      kodeBooking: b.kodeBooking,
      namaClient: b.namaClient,
      status: b.status,
      tanggalSesi: b.tanggalSesi?.toISOString() ?? null,
      hargaPaket: Number(b.hargaPaket ?? 0),
      dpStatus: b.dpStatus,
      createdAt: b.createdAt.toISOString(),
      namaPaket: b.paket?.namaPaket ?? null,
    })),
  };
}

/**
 * Deferred data — below the fold: charts (revenue trend + top packages).
 * Di-fetch terpisah agar tidak memblokir render critical content.
 */
async function getDeferredData(vendorId: string) {
  const now = new Date();

  const [topPackagesRaw, trendRaw] = await Promise.all([
    prisma.booking.groupBy({
      by: ["paketId"],
      where: { vendorId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.payment.findMany({
      where: {
        booking: { vendorId },
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
      },
      select: { jumlah: true, tipe: true, createdAt: true },
    }),
  ]);

  const paketIds = topPackagesRaw.map((p) => p.paketId).filter(Boolean) as string[];
  const pakets = await prisma.package.findMany({
    where: { id: { in: paketIds } },
    select: { id: true, namaPaket: true, kategori: true },
  });
  const paketMap = new Map(pakets.map((p) => [p.id, p]));

  const topPackages = topPackagesRaw.map((p) => ({
    paketId: p.paketId,
    count: p._count.id,
    namaPaket: paketMap.get(p.paketId ?? "")?.namaPaket ?? "Unknown",
    kategori: paketMap.get(p.paketId ?? "")?.kategori ?? "",
  }));

  const trendMap = new Map<string, { pemasukan: number; dp: number; pelunasan: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trendMap.set(
      d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
      { pemasukan: 0, dp: 0, pelunasan: 0 }
    );
  }
  trendRaw.forEach((p) => {
    const key = new Date(p.createdAt).toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    const entry = trendMap.get(key);
    if (entry) {
      const jumlah = Number(p.jumlah);
      entry.pemasukan += jumlah;
      if (p.tipe === "DP") entry.dp += jumlah;
      else entry.pelunasan += jumlah;
    }
  });

  return {
    topPackages,
    trendData: Array.from(trendMap.entries()).map(([bulan, val]) => ({ bulan, ...val })),
  };
}

// ─── Async sub-components untuk Suspense ─────────────────────────────────────

async function DashboardCharts({ vendorId }: { vendorId: string }) {
  const { trendData, topPackages } = await getDeferredData(vendorId);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <RevenueChart data={trendData} />
      <TopPackagesChart data={topPackages} />
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      ))}
    </div>
  );
}

export async function DashboardContent() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-600">Sesi tidak valid</p>
      </div>
    );
  }

  let data;
  try {
    data = await getCriticalData(session.user.id);
  } catch {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-600">Gagal memuat data dashboard</p>
        <p className="text-xs text-red-400 mt-1">Coba refresh halaman</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Metric Cards — critical, render pertama */}
      <MetricsCards overview={data.overview} />

      {/* Quick Actions — hanya muncul di mobile (di desktop cukup pakai sidebar) */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <Link href="/admin/events"
          className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          Events
        </Link>
        <Link href="/admin/galleries"
          className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          Galleries
        </Link>
        <Link href="/admin/clients"
          className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          Clients
        </Link>
        <Link href="/admin/settings"
          className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          Settings
        </Link>
      </div>

      {/* Charts — deferred via Suspense, tidak blokir render critical content */}
      <Suspense fallback={<ChartsSkeleton />}>
        <DashboardCharts vendorId={session.user.id} />
      </Suspense>

      {/* Bottom Row — calendar + recent bookings */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <SessionCalendar sessions={data.upcomingSessions} />
        <RecentBookings bookings={data.recentBookings} />
      </div>
    </div>
  );
}
