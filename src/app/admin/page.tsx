import Link from "next/link";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

const quickActions = [
  { label: "Create Event", href: "/admin/events" },
  { label: "Manage Galleries", href: "/admin/galleries" },
  { label: "View Clients", href: "/admin/clients" },
  { label: "Settings", href: "/admin/settings" },
];

async function getDashboardData(vendorId: string) {
  const [
    clientCount,
    bookingCount,
    activeBookingCount,
    galleryCount,
    upcomingBookings,
  ] = await Promise.all([
    prisma.client.count({ where: { vendorId } }),
    prisma.booking.count({ where: { vendorId } }),
    prisma.booking.count({
      where: { vendorId, status: { in: ["PENDING", "CONFIRMED"] } },
    }),
    prisma.gallery.count({ where: { vendorId } }),
    prisma.booking.findMany({
      where: { vendorId, status: { in: ["PENDING", "CONFIRMED"] } },
      orderBy: { tanggalSesi: "asc" },
      take: 5,
      select: {
        id: true,
        namaClient: true,
        status: true,
        tanggalSesi: true,
        galleries: {
          select: { id: true, status: true },
          take: 1,
        },
      },
    }),
  ]);

  return { clientCount, bookingCount, activeBookingCount, galleryCount, upcomingBookings };
}

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { clientCount, bookingCount, activeBookingCount, galleryCount, upcomingBookings } =
    await getDashboardData(session.user.id);

  const overviewCards = [
    { label: "Active Bookings", value: activeBookingCount },
    { label: "Total Bookings", value: bookingCount },
    { label: "Galleries", value: galleryCount },
    { label: "Clients", value: clientCount },
  ];

  return (
    <section className="space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-500 to-sky-700" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Studio Overview
            </p>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              Welcome back
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl">
          Here is the latest activity across your bookings and galleries.
        </p>
      </header>

      {/* Metrics Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <div
            key={card.label}
            className="group rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl p-6 shadow-sm transition-all duration-300 hover:shadow-glass hover:border-white/40"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-900 tracking-tight">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Upcoming Bookings */}
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Upcoming Bookings
          </h2>
          {upcomingBookings.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No upcoming bookings.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcomingBookings.map((booking) => (
                <li key={booking.id} className="flex items-start gap-3 text-sm text-slate-600">
                  <svg className="mt-0.5 h-4 w-4 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <span className="font-medium text-slate-800">{booking.namaClient}</span>
                    {booking.tanggalSesi && (
                      <span className="ml-2 text-xs text-slate-400">
                        {new Date(booking.tanggalSesi).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      booking.status === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Link href="/admin/events" className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors">
              View all events →
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Quick Actions</h2>
          <div className="mt-4 flex flex-col gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-left text-sm font-medium text-slate-700 backdrop-blur-sm transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-sm"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
