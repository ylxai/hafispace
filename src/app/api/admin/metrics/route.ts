import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse } from "@/lib/api/response";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const vendorId = session.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalBookings,
    bookingsBulanIni,
    totalClients,
    allPayments,
    paymentsBulanIni,
    topPackages,
    upcomingSessionsThisMonth,
    recentBookings,
    paymentsTrend,
  ] = await Promise.all([
    prisma.booking.count({ where: { vendorId } }),
    prisma.booking.count({
      where: { vendorId, createdAt: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.client.count({ where: { vendorId } }),
    prisma.payment.findMany({ where: { vendorId }, select: { jumlah: true } }),
    prisma.payment.findMany({
      where: { vendorId, createdAt: { gte: startOfMonth, lte: endOfMonth } },
      select: { jumlah: true, tipe: true },
    }),
    prisma.booking.groupBy({
      by: ["paketId"],
      where: { vendorId, paketId: { not: null } },
      _count: { paketId: true },
      orderBy: { _count: { paketId: "desc" } },
      take: 5,
    }),
    prisma.booking.findMany({
      where: {
        vendorId,
        tanggalSesi: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
      },
      orderBy: { tanggalSesi: "asc" },
      select: {
        id: true,
        namaClient: true,
        tanggalSesi: true,
        status: true,
        paket: { select: { namaPaket: true } },
      },
    }),
    prisma.booking.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take: 5,
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
    }),
    prisma.payment.findMany({
      where: { vendorId, createdAt: { gte: sixMonthsAgo } },
      select: { jumlah: true, createdAt: true, tipe: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Hitung total menggunakan Prisma.Decimal untuk menghindari floating point error
  const totalOmset = allPayments
    .reduce((sum, p) => sum.add(p.jumlah), new Prisma.Decimal(0))
    .toNumber();
  const pemasukanBulanIni = paymentsBulanIni
    .reduce((sum, p) => sum.add(p.jumlah), new Prisma.Decimal(0))
    .toNumber();
  const dpBulanIni = paymentsBulanIni
    .filter((p) => p.tipe === "DP")
    .reduce((sum, p) => sum.add(p.jumlah), new Prisma.Decimal(0))
    .toNumber();

  // Resolve nama paket
  const packageIds = topPackages.map((p) => p.paketId).filter(Boolean) as string[];
  const packageNames = await prisma.package.findMany({
    where: { id: { in: packageIds } },
    select: { id: true, namaPaket: true, kategori: true },
  });
  const packageMap = new Map(packageNames.map((p) => [p.id, p]));

  const topPackagesWithNames = topPackages.map((p) => ({
    paketId: p.paketId,
    count: p._count.paketId,
    namaPaket: packageMap.get(p.paketId ?? "")?.namaPaket ?? "Tanpa Paket",
    kategori: packageMap.get(p.paketId ?? "")?.kategori ?? "LAINNYA",
  }));

  // Tren 6 bulan
  const trendMap = new Map<string, { bulan: string; pemasukan: number; dp: number; pelunasan: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    trendMap.set(key, { bulan: label, pemasukan: 0, dp: 0, pelunasan: 0 });
  }
  for (const p of paymentsTrend) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = trendMap.get(key);
    if (entry) {
      const jumlah = new Prisma.Decimal(p.jumlah).toNumber();
      entry.pemasukan += jumlah;
      if (p.tipe === "DP") entry.dp += jumlah;
      if (p.tipe === "PELUNASAN") entry.pelunasan += jumlah;
    }
  }

  return NextResponse.json({
    overview: { totalBookings, bookingsBulanIni, totalClients, totalOmset, pemasukanBulanIni, dpBulanIni },
    topPackages: topPackagesWithNames,
    upcomingSessions: upcomingSessionsThisMonth.map((b) => ({
      id: b.id,
      namaClient: b.namaClient,
      tanggalSesi: b.tanggalSesi?.toISOString() ?? null,
      status: b.status,
      namaPaket: b.paket?.namaPaket ?? null,
    })),
    recentBookings: recentBookings.map((b) => ({
      id: b.id,
      kodeBooking: b.kodeBooking,
      namaClient: b.namaClient,
      status: b.status,
      tanggalSesi: b.tanggalSesi?.toISOString() ?? null,
      hargaPaket: new Prisma.Decimal(b.hargaPaket ?? 0).toNumber(),
      dpStatus: b.dpStatus,
      createdAt: b.createdAt.toISOString(),
      namaPaket: b.paket?.namaPaket ?? null,
    })),
    trendData: Array.from(trendMap.values()),
  });
}
