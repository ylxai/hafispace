"use client";

import { useState } from "react";
import { SAVED_FEEDBACK_DURATION_MS } from "@/lib/constants";

export function StudioProfilePanel() {
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
      setTimeout(() => setSaved(false), SAVED_FEEDBACK_DURATION_MS);
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

