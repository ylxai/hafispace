"use client";

/**
 * Consistent page header untuk semua admin pages.
 * Menampilkan title, subtitle opsional, dan slot untuk CTA buttons.
 */

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  label?: string; // small label di atas title (e.g. "Booking Manager")
  children?: React.ReactNode; // CTA buttons / actions
};

export function PageHeader({ title, subtitle, label, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-sky-500 to-sky-700" />
          <div>
            {label && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {label}
              </p>
            )}
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          </div>
        </div>
        {subtitle && (
          <p className="pl-4 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </header>
  );
}
