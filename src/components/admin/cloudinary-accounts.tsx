"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";

type CloudinaryAccount = {
  id: string;
  name: string;
  cloudName: string;
  apiKey: string | null;
  isActive: boolean;
  isDefault: boolean;
  storageUsed: number;
  createdAt: string;
};

export function CloudinaryAccountsPanel() {
  const [accounts, setAccounts] = useState<CloudinaryAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    cloudName: "",
    apiKey: "",
    apiSecret: "",
    setAsDefault: false,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/admin/settings/cloudinary/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsAdding(true);

    try {
      const res = await fetch("/api/admin/settings/cloudinary/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to add account");
        return;
      }

      toast.success("Cloudinary account added successfully");
      setFormData({ name: "", cloudName: "", apiKey: "", apiSecret: "", setAsDefault: false });
      fetchAccounts();
    } catch {
      toast.error("Failed to add account");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch("/api/admin/settings/cloudinary/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, setAsDefault: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to set as default");
        return;
      }

      toast.success("Default account updated");
      fetchAccounts();
    } catch {
      toast.error("Failed to set as default");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this account?")) return;

    try {
      const res = await fetch(`/api/admin/settings/cloudinary/accounts?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete account");
        return;
      }

      toast.success("Account deleted");
      fetchAccounts();
    } catch {
      toast.error("Failed to delete account");
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/admin/settings/cloudinary/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update account");
        return;
      }

      fetchAccounts();
    } catch {
      toast.error("Failed to update account");
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="animate-pulse">
          <div className="h-4 w-32 rounded bg-slate-200"></div>
          <div className="mt-4 space-y-3">
            <div className="h-20 rounded bg-slate-200"></div>
            <div className="h-20 rounded bg-slate-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Cloudinary Accounts</h2>
        <p className="text-sm text-slate-600">
          Kelola akun Cloudinary untuk menyimpan foto client. Anda bisa menambah beberapa akun.
        </p>
      </div>

      {/* Account List */}
      {accounts.length > 0 && (
        <div className="mb-6 space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`flex items-center justify-between rounded-xl border p-4 ${
                account.isActive ? "border-slate-200" : "border-slate-100 bg-slate-50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{account.name}</p>
                    {account.isDefault && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Default
                      </span>
                    )}
                    {!account.isActive && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{account.cloudName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!account.isDefault && account.isActive && (
                  <button
                    onClick={() => handleSetDefault(account.id)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Jadikan Default
                  </button>
                )}
                <button
                  onClick={() => handleToggleActive(account.id, account.isActive)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    account.isActive
                      ? "text-amber-600 hover:bg-amber-50"
                      : "text-green-600 hover:bg-green-50"
                  }`}
                >
                  {account.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Account Form — collapsible untuk mengurangi visual noise di mobile */}
      <CloudinaryAddForm onSubmit={handleSubmit} formData={formData} setFormData={setFormData} isAdding={isAdding} />
        
    </div>
  );
}

// Komponen collapsible form tambah akun — mengurangi visual noise di mobile
function CloudinaryAddForm({
  onSubmit,
  formData,
  setFormData,
  isAdding,
}: {
  onSubmit: (e: React.FormEvent) => void;
  formData: { name: string; cloudName: string; apiKey: string; apiSecret: string; setAsDefault: boolean };
  setFormData: (f: { name: string; cloudName: string; apiKey: string; apiSecret: string; setAsDefault: boolean }) => void;
  isAdding: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        <span>+ Tambah Akun Cloudinary Baru</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible form */}
      {isOpen && (
        <form onSubmit={onSubmit} className="space-y-4 border-t border-slate-200 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Nama Akun</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Misal: Akun Utama, Akun Cadangan"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Cloud Name</label>
              <input
                type="text"
                value={formData.cloudName}
                onChange={(e) => setFormData({ ...formData, cloudName: e.target.value })}
                placeholder="Misal: doweertbx"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">API Key</label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="Cloudinary API Key"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">API Secret</label>
              <input
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                placeholder="Cloudinary API Secret"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="setAsDefault"
              checked={formData.setAsDefault}
              onChange={(e) => setFormData({ ...formData, setAsDefault: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            <label htmlFor="setAsDefault" className="text-sm text-slate-700">Jadikan akun default</label>
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isAdding ? "Menambah..." : "Tambah Akun"}
          </button>
        </form>
      )}
    </div>
  );
}
