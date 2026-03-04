import { auth } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/admin/dashboard/dashboard-content";

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const monthLabel = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-500 to-sky-700" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {monthLabel}
            </p>
    
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Selamat datang, <span className="font-medium text-slate-700">{session.user.name ?? "Admin"}</span>
        </p>
      </header>

      {/* Dynamic Dashboard Content (client component) */}
      <DashboardContent />
    </section>
  );
}
