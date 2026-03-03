import type { ReactNode } from "react";

import { AdminHeader, AdminNavigation } from "@/components/admin";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminHeader />
      <main className="px-4 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <AdminNavigation />
          {children}
        </div>
      </main>
    </div>
  );
}
