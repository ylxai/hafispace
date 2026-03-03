"use client";

import { signOut, useSession } from "next-auth/react";

export function AdminHeader() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-white px-4 py-3 text-sm font-medium">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">Hafispace</span>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>{session?.user?.name ?? "Admin"}</span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
