import { auth } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/admin/dashboard/dashboard-content";
import { PageHeader } from "@/components/admin/shared";

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const monthLabel = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <section className="space-y-6">
      {/* Header */}
      <PageHeader label={monthLabel} title="Dashboard">
        <p className="text-sm text-slate-500">
          Selamat datang,{" "}
          <span className="font-medium text-slate-700">{session.user.name ?? "Admin"}</span>
        </p>
      </PageHeader>

      {/* Dynamic Dashboard Content */}
      <DashboardContent />
    </section>
  );
}
