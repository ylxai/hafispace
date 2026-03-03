import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminSidebar />
      {/* Desktop: offset content untuk sidebar (w-60) */}
      {/* Mobile: offset content untuk top bar (h-14) */}
      <main className="lg:pl-60">
        <div className="px-4 py-6 pt-20 lg:pt-6">
          <div className="mx-auto w-full max-w-5xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
