"use client";

/**
 * Settings Accordion wrapper — consistent panel untuk Settings page.
 * Setiap panel bisa expand/collapse. Icon & badge opsional.
 * State expand disimpan di localStorage agar persists antar navigasi.
 */

import { useEffect,useState } from "react";

type SettingsAccordionProps = {
  id: string;           // unique ID untuk localStorage key
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;       // optional badge (e.g. "New", "Beta", jumlah akun)
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function SettingsAccordion({
  id,
  title,
  description,
  icon,
  badge,
  defaultOpen = false,
  children,
}: SettingsAccordionProps) {
  const storageKey = `settings-accordion-${id}`;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Baca dari localStorage saat mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) setIsOpen(stored === "true");
    } catch (error) {
      console.warn(`Gagal membaca state accordion '${id}' dari localStorage:`, error);
    }
  }, [storageKey, id]);

  function toggle() {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch (error) {
      console.warn(`Gagal menyimpan state accordion '${id}' ke localStorage:`, error);
    }
  }

  return (
    <div className={`rounded-2xl border bg-white shadow-sm transition-all duration-200 ${
      isOpen ? "border-slate-300" : "border-slate-200"
    }`}>
      {/* Header — selalu visible, klik untuk toggle */}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/50 rounded-2xl"
        aria-expanded={isOpen}
      >
        {/* Icon */}
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            {icon}
          </span>
        )}

        {/* Title + Description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{title}</span>
            {badge && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
