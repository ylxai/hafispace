"use client";

import { useState } from "react";
import { SAVED_FEEDBACK_DURATION_MS } from "@/lib/constants";

export function ViesusEnhancementPanel() {
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
      setTimeout(() => setSaved(false), SAVED_FEEDBACK_DURATION_MS);
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

