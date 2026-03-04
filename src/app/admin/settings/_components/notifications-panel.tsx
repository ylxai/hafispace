"use client";

import { useState } from "react";

export function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [newBooking, setNewBooking] = useState(true);
  const [galleryDelivered, setGalleryDelivered] = useState(true);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
      <p className="mt-2 text-sm text-slate-600">
        Configure email templates and delivery alerts.
      </p>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
      >
        {isOpen ? "Close" : "Configure"}
      </button>

      {isOpen && (
        <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          {[
            { label: "Email Notifications", value: emailEnabled, set: setEmailEnabled, desc: "Receive email alerts for studio activity" },
            { label: "New Booking Alert", value: newBooking, set: setNewBooking, desc: "Get notified when a new booking is created" },
            { label: "Gallery Delivered", value: galleryDelivered, set: setGalleryDelivered, desc: "Notify clients when gallery is ready" },
          ].map(({ label, value, set, desc }) => (
            <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => set(!value)}
                className={`relative h-6 w-11 rounded-full transition ${value ? "bg-slate-900" : "bg-slate-200"}`}
                aria-label={`Toggle ${label}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

