"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";

interface CustomField {
  id: string;
  label: string;
  tipe: "TEXT" | "TEXTAREA" | "DATE";
  isRequired: boolean;
  urutan: number;
  isActive: boolean;
}

export function CustomFieldsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [newField, setNewField] = useState({
    label: "",
    tipe: "TEXT" as "TEXT" | "TEXTAREA" | "DATE",
    isRequired: false,
  });

  const { data, isLoading } = useQuery<{ fields: CustomField[] }>({
    queryKey: ["custom-fields"],
    queryFn: async () => {
      const res = await fetch("/api/admin/custom-fields");
      if (!res.ok) throw new Error("Gagal memuat custom fields");
      return res.json() as Promise<{ fields: CustomField[] }>;
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newField) => {
      const res = await fetch("/api/admin/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Gagal menambah field");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast.success("Custom field berhasil ditambahkan!");
      setShowModal(false);
      setNewField({ label: "", tipe: "TEXT", isRequired: false });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  async function handleDelete(id: string) {
    if (!confirm("Hapus field ini? Data yang sudah diisi klien akan hilang.")) return;
    try {
      const res = await fetch(`/api/admin/custom-fields?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Gagal menghapus field");
      }
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast.success("Field berhasil dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus field");
    }
  }

  function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!newField.label.trim()) {
      toast.error("Label field harus diisi");
      return;
    }
    createMutation.mutate(newField);
  }

  const fields = data?.fields ?? [];

  const TIPE_LABELS: Record<CustomField["tipe"], string> = {
    TEXT: "Text",
    TEXTAREA: "Textarea",
    DATE: "Date",
  };

  const TIPE_COLORS: Record<CustomField["tipe"], string> = {
    TEXT: "bg-blue-100 text-blue-700",
    TEXTAREA: "bg-purple-100 text-purple-700",
    DATE: "bg-green-100 text-green-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Custom Fields</h2>
      <p className="mt-2 text-sm text-slate-600">
        Tambah field kustom untuk form booking (nama klien, tanggal event, dll).
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
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              {fields.length} Custom Field{fields.length !== 1 ? "s" : ""}
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Field
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : fields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">Belum ada custom field</p>
              <p className="text-xs text-slate-400 mt-1">Klik "Add Field" untuk menambah</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition"
                >
                  <div className="cursor-move text-slate-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{field.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TIPE_COLORS[field.tipe]}`}>
                        {TIPE_LABELS[field.tipe]}
                      </span>
                      {field.isRequired && (
                        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(field.id)}
                    className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Field Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Add Custom Field</h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setNewField({ label: "", tipe: "TEXT", isRequired: false });
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddField} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newField.label}
                  onChange={(e) => setNewField((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Contoh: Nama Pasangan, Tanggal Acara"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipe Input</label>
                <select
                  value={newField.tipe}
                  onChange={(e) => setNewField((f) => ({ ...f, tipe: e.target.value as typeof f.tipe }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 bg-white"
                >
                  <option value="TEXT">Text</option>
                  <option value="TEXTAREA">Textarea</option>
                  <option value="DATE">Date</option>
                </select>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={newField.isRequired}
                  onChange={(e) => setNewField((f) => ({ ...f, isRequired: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="isRequired" className="text-sm text-slate-700 cursor-pointer">
                  Field wajib diisi (required)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setNewField({ label: "", tipe: "TEXT", isRequired: false });
                  }}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Adding..." : "Add Field"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

