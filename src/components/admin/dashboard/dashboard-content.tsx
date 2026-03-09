import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { MetricsCards } from "./metrics-cards";
import { RevenueChart } from "./revenue-chart";
import { TopPackagesChart } from "./top-packages-chart";
import { SessionCalendar } from "./session-calendar";
import { RecentBookings } from "./recent-bookings";

async function getDashboardData(vendorId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalBookings,
    bookingsBulanIni,
    totalClients,
    totalOmsetAgg,
    pemasukanBulanIniAgg,
    dpBulanIniAgg,
    topPackagesRaw,
    upcomingSessions,
    recentBookings,
    trendRaw,
  ] = await Promise.all([
    // Total bookings
    prisma.booking.count({ where: { vendorId } }),

    // Bookings bulan ini
    prisma.booking.count({
      where: { vendorId, createdAt: { gte: startOfMonth } },
    }),

    // Total clients
    prisma.client.count({
      where: { bookings: { some: { vendorId } } },
    }),

    // Total omset (aggregate)
    prisma.payment.aggregate({
      where: { booking: { vendorId } },
      _sum: { jumlah: true },
    }),

    // Pemasukan bulan ini (aggregate)
    prisma.payment.aggregate({
      where: {
        booking: { vendorId },
        createdAt: { gte: startOfMonth },
      },
      _sum: { jumlah: true },
    }),

    // DP bulan ini (aggregate)
    prisma.payment.aggregate({
      where: {
        booking: { vendorId },
        createdAt: { gte: startOfMonth },
        tipe: "DP",
      },
      _sum: { jumlah: true },
    }),

    // Top packages
    prisma.booking.groupBy({
      by: ["paketId"],
      where: { vendorId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),

    // Upcoming sessions
    prisma.booking.findMany({
      where: {
        vendorId,
        tanggalSesi: { gte: startOfMonth },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        namaClient: true,
        tanggalSesi: true,
        status: true,
        paket: { select: { namaPaket: true } },
      },
      orderBy: { tanggalSesi: "asc" },
      take: 5,
    }),

    // Recent bookings
    prisma.booking.findMany({
      where: { vendorId },
      select: {
        id: true,
        kodeBooking: true,
        namaClient: true,
        status: true,
        tanggalSesi: true,
        hargaPaket: true,
        dpStatus: true,
        createdAt: true,
        paket: { select: { namaPaket: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Trend data (last 6 months)
    prisma.payment.findMany({
      where: {
        booking: { vendorId },
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        },
      },
      select: {
        jumlah: true,
        tipe: true,
        createdAt: true,
      },
    }),
  ]);

  // Resolve package names for top packages
  const paketIds = topPackagesRaw
    .map((p) => p.paketId)
    .filter(Boolean) as string[];

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

  // Process trend data
  const trendMap = new Map<
    string,
    { pemasukan: number; dp: number; pelunasan: number }
  >();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("id-ID", {
      month: "short",
      year: "2-digit",
    });
    trendMap.set(key, { pemasukan: 0, dp: 0, pelunasan: 0 });
  }

  trendRaw.forEach((p) => {
    const key = new Date(p.createdAt).toLocaleDateString("id-ID", {
      month: "short",
      year: "2-digit",
    });
    const entry = trendMap.get(key);
    if (entry) {
      const jumlah = Number(p.jumlah);
      entry.pemasukan += jumlah;
      if (p.tipe === "DP") entry.dp += jumlah;
      else entry.pelunasan += jumlah;
    }
  });

  const trendData = Array.from(trendMap.entries()).map(([bulan, val]) => ({
    bulan,
    ...val,
  }));

  return {
    overview: {
      totalBookings,
      bookingsBulanIni,
      totalClients,
      totalOmset: Number(totalOmsetAgg._sum.jumlah ?? 0),
      pemasukanBulanIni: Number(pemasukanBulanIniAgg._sum.jumlah ?? 0),
      dpBulanIni: Number(dpBulanIniAgg._sum.jumlah ?? 0),
    },
    topPackages,
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
    trendData,
  };
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
    data = await getDashboardData(session.user.id);
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
