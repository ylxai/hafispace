"use client";

import Link from "next/link";

interface Session {
  id: string;
  namaClient: string;
  tanggalSesi: string | null;
  status: string;
  namaPaket: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-100 text-red-500",
};

export function SessionCalendar({ sessions }: { sessions: Session[] }) {
  const now = new Date();
  const monthLabel = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Jadwal Sesi</h2>
          <p className="text-xs text-slate-400">{monthLabel}</p>
        </div>
        <Link href="/admin/events" className="text-xs font-medium text-sky-600 hover:text-sky-700">
          Lihat semua →
        </Link>
      </div>

      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Tidak ada sesi bulan ini</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => {
            const date = session.tanggalSesi ? new Date(session.tanggalSesi) : null;
            const isToday = date
              ? date.toDateString() === now.toDateString()
              : false;
            const isPast = date ? date < now && !isToday : false;

            return (
              <li
                key={session.id}
                className={`flex items-start gap-3 rounded-xl p-3 ${isToday ? "bg-sky-50 border border-sky-100" : "border border-slate-50 bg-slate-50/50"} ${isPast ? "opacity-60" : ""}`}
              >
                {/* Tanggal */}
                <div className={`shrink-0 rounded-lg px-2 py-1 text-center min-w-[40px] ${isToday ? "bg-sky-500 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>
                  <p className="text-[10px] font-medium leading-none">
                    {date?.toLocaleDateString("id-ID", { month: "short" })}
                  </p>
                  <p className="text-lg font-bold leading-tight">
                    {date?.getDate()}
                  </p>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{session.namaClient}</p>
                    {isToday && (
                      <span className="shrink-0 rounded-full bg-sky-500 px-1.5 py-0.5 text-[9px] font-bold text-white">HARI INI</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    {session.namaPaket && (
                      <p className="truncate text-xs text-slate-400">{session.namaPaket}</p>
                    )}
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[session.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {session.status}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
