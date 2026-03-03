"use client";

import { useAdminMetrics } from "@/hooks/use-admin-metrics";

const quickActions = [
  "Create event",
  "Upload gallery",
  "Send invite",
  "Review comments",
];

export default function AdminHomePage() {
  const { data, isLoading } = useAdminMetrics();

  const overviewCards = [
    { label: "Active Bookings", value: data?.activeBookingCount ?? 0 },
    { label: "Total Bookings", value: data?.bookingCount ?? 0 },
    { label: "Galleries", value: data?.galleryCount ?? 0 },
    { label: "Clients", value: data?.clientCount ?? 0 },
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
              {isLoading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded-lg bg-slate-200/60" />
              ) : (
                card.value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Upcoming Workflows
          </h2>
          <ul className="mt-4 space-y-3">
            {["Review curation list for Lestari Wedding", "Send gallery access for Studio Session", "Prepare highlights for Ridwan & Maya"].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                <svg className="mt-0.5 h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Quick Actions</h2>
          <div className="mt-4 flex flex-col gap-3">
            {quickActions.map((action) => (
              <button
                key={action}
                className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-left text-sm font-medium text-slate-700 backdrop-blur-sm transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                type="button"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
