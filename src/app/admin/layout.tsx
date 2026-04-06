import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/sidebar";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export const metadata: Metadata = {
  title: {
    template: "%s | Hafiportrait Admin",
    default: "Dashboard | Hafiportrait Admin",
  },
  description: "Hafiportrait photography platform admin dashboard.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AdminSidebar />
      {/* Desktop: offset content for sidebar (w-60) */}
      {/* Mobile: offset content for top bar (h-14) */}
      <main className="lg:pl-60">
        <div className="px-4 py-6 pt-20 lg:pt-6">
          <div className="mx-auto w-full max-w-5xl">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
