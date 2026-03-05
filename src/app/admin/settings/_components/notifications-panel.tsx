"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface NotifPrefs {
  notifEmail: boolean;
  notifNewBooking: boolean;
  notifGalleryDelivered: boolean;
}

export function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>({
    notifEmail: true,
    notifNewBooking: true,
    notifGalleryDelivered: true,
  });
  const toast = useToast();

  async function loadPrefs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setPrefs({
          notifEmail: data.vendor.notifEmail ?? true,
          notifNewBooking: data.vendor.notifNewBooking ?? true,
          notifGalleryDelivered: data.vendor.notifGalleryDelivered ?? true,
        });
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(key: keyof NotifPrefs) {
    const newValue = !prefs[key];
    // Optimistic update
    setPrefs((prev) => ({ ...prev, [key]: newValue }));

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });

      if (!res.ok) {
        // Revert on failure
        setPrefs((prev) => ({ ...prev, [key]: !newValue }));
        toast.error("Gagal menyimpan pengaturan notifikasi");
      }
    } catch {
      // Revert on failure
      setPrefs((prev) => ({ ...prev, [key]: !newValue }));
      toast.error("Gagal menyimpan pengaturan notifikasi");
    }
  }

  function handleOpen() {
    if (!isOpen) {
      loadPrefs();
    }
    setIsOpen((v) => !v);
  }

  const items = [
    {
      label: "Email Notifications",
      key: "notifEmail" as const,
      desc: "Receive email alerts for studio activity",
    },
    {
      label: "New Booking Alert",
      key: "notifNewBooking" as const,
      desc: "Get notified when a new booking is created",
    },
    {
      label: "Gallery Delivered",
      key: "notifGalleryDelivered" as const,
      desc: "Notify clients when gallery is ready",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
      <p className="mt-2 text-sm text-slate-600">
        Configure email templates and delivery alerts.
      </p>
      <button
        type="button"
        onClick={handleOpen}
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
      >
        {isOpen ? "Close" : "Configure"}
      </button>

      {isOpen && (
        <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : (
            items.map(({ label, key, desc }) => (
              <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(key)}
                  className={`relative h-6 w-11 rounded-full transition ${prefs[key] ? "bg-slate-900" : "bg-slate-200"}`}
                  aria-label={`Toggle ${label}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs[key] ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
