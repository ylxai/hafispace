"use client";

import { useState } from "react";
import { CloudinaryAccountsPanel } from "@/components/admin/cloudinary-accounts";

function StudioProfilePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<{ namaStudio?: string; phone?: string; email?: string } | null>(null);

  async function loadProfile() {
    if (profile) return;
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json() as { vendor: { namaStudio?: string; phone?: string; email?: string } };
        setProfile(data.vendor);
      }
    } catch { /* silent */ }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    const form = e.currentTarget;
    const payload = {
      namaStudio: (form.elements.namedItem("namaStudio") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
    };
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json() as { vendor: typeof payload };
      setProfile(data.vendor);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleToggle() {
    if (!isOpen) loadProfile();
    setIsOpen((v) => !v);
  }

  return (
    <div className="group rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl p-6 shadow-sm transition-all duration-300 hover:shadow-glass hover:border-white/40">
      <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Studio Profile</h2>
      <p className="mt-2 text-sm text-slate-600">
        Update brand name, logo, and contact information.
      </p>
      <button
        type="button"
        onClick={handleToggle}
        className="mt-4 rounded-full border border-slate-200 bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 backdrop-blur-sm transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900"
      >
        {isOpen ? "Close" : "Configure"}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="namaStudio">
              Studio Name
            </label>
            <input
              id="namaStudio"
              name="namaStudio"
              type="text"
              defaultValue={profile?.namaStudio ?? ""}
              placeholder="Your Studio Name"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile?.phone ?? ""}
              placeholder="+6281234567890"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={profile?.email ?? ""}
              placeholder="studio@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            {saved && (
              <span className="text-sm text-green-600">✓ Saved successfully</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function AccessControlPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Access Control</h2>
      <p className="mt-2 text-sm text-slate-600">
        Manage admins, client invitations, and permissions.
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
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Client Invitation Link</p>
            <p className="mt-1 text-xs text-slate-500">Share this link with clients to grant access to their gallery.</p>
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value="https://hafiportrait.com/invite/abc123"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText("https://hafiportrait.com/invite/abc123")}
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-300"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Admin Access</p>
            <p className="mt-1 text-xs text-slate-500">Only the studio owner can access this admin panel.</p>
            <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              ✓ Secured
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsPanel() {
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

function ViesusEnhancementPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [enableViesus, setEnableViesus] = useState(false);

  async function loadConfig() {
    if (isOpen) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setEnableViesus(data.enableViesusEnhancement ?? false);
      }
    } catch (err) {
      setError("Failed to load VIESUS configuration");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    if (!isOpen) {
      await loadConfig();
    }
    setIsOpen((v) => !v);
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enableViesusEnhancement: !enableViesus
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setEnableViesus(!enableViesus); // Toggle the state after successful save
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Failed to save VIESUS enhancement settings");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">VIESUS Enhancement</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enable automatic image enhancement using VIESUS technology.
      </p>
      <button
        type="button"
        onClick={handleToggle}
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
      >
        {isOpen ? "Close" : enableViesus ? "Manage" : "Configure"}
      </button>

      {isOpen && (
        <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="h-4 w-24 rounded-full bg-slate-200"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-medium text-slate-900">Enable VIESUS Enhancement</h3>
                  <p className="text-sm text-slate-600">
                    Automatically enhance uploaded images using VIESUS technology to improve contrast, saturation, and brightness.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Free - 50 Monthly Units available for VIESUS enhancement
                  </p>
                </div>
                <label className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-slate-400 focus-within:ring-offset-2">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={enableViesus}
                    onChange={handleSave}
                    disabled={isSaving}
                  />
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                      enableViesus ? 'translate-x-5' : ''
                    }`}
                  />
                </label>
              </div>

              {enableViesus ? (
                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-700">✓ VIESUS Enhancement Active</p>
                  <p className="mt-1 text-xs text-green-600">Your uploaded images will be automatically enhanced.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">VIESUS Enhancement Disabled</p>
                  <p className="mt-1 text-xs text-slate-500">Your uploaded images will not be enhanced.</p>
                </div>
              )}

              <div className="pt-2">
                {saved && (
                  <span className="text-sm text-green-600">✓ Saved successfully</span>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <section className="space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-500 to-sky-700" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Studio Settings
            </p>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              Settings
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl">
          Configure your studio preferences, integrations, and access policies.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <StudioProfilePanel />
        <AccessControlPanel />
        <NotificationsPanel />
        <CloudinaryAccountsPanel />
        <ViesusEnhancementPanel />
      </div>
    </section>
  );
}
