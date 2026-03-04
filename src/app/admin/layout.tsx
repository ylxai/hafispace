import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/sidebar";
import { BottomNav } from "@/components/admin/bottom-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminSidebar />
      {/* Desktop: offset content untuk sidebar (w-60) */}
      {/* Mobile: offset content untuk top bar (h-14) + bottom nav (h-16) */}
      <main className="lg:pl-60">
        <div className="px-4 py-6 pt-20 pb-24 lg:pt-6 lg:pb-6">
          <div className="mx-auto w-full max-w-5xl">
            {children}
          </div>
        </div>
      </main>
      {/* Bottom Navigation — mobile only (hidden di lg+) */}
      <BottomNav />
    </div>
  );
}
