"use client";

import { useState } from "react";

export function AccessControlPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

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
                value={`${baseUrl}/invite`}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`${baseUrl}/invite`)}
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

