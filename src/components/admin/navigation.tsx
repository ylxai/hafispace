"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Events", href: "/admin/events" },
  { label: "Galleries", href: "/admin/galleries" },
  { label: "Clients", href: "/admin/clients" },
  { label: "Settings", href: "/admin/settings" },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-3 text-xs font-medium text-slate-600">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full border px-4 py-2 transition ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
