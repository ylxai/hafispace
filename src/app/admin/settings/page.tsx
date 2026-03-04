"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SAVED_FEEDBACK_DURATION_MS } from "@/lib/constants";
import { CloudinaryAccountsPanel } from "@/components/admin/cloudinary-accounts";
import { useToast } from "@/components/ui/toast";

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
                value={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite`}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite`)}
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

function FormBookingPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const { data: session } = useSession();
  const toast = useToast();
  const [formData, setFormData] = useState({
    bookingFormActive: false,
    waAdmin: "",
    dpPercentage: 30,
    rekeningPembayaran: "",
    syaratKetentuan: "",
    themeColor: "#0f172a",
    successMessage: "",
  });

  async function loadSettings() {
    if (formData.rekeningPembayaran) return;
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setFormData({
          bookingFormActive: data.vendor.bookingFormActive ?? false,
          waAdmin: data.vendor.waAdmin ?? "",
          dpPercentage: data.vendor.dpPercentage ?? 30,
          rekeningPembayaran: data.vendor.rekeningPembayaran ?? "",
          syaratKetentuan: data.vendor.syaratKetentuan ?? "",
          themeColor: data.vendor.themeColor ?? "#0f172a",
          successMessage: data.vendor.successMessage ?? "",
        });
      }
    } catch { /* silent */ }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setFormData({
        bookingFormActive: data.vendor.bookingFormActive ?? false,
        waAdmin: data.vendor.waAdmin ?? "",
        dpPercentage: data.vendor.dpPercentage ?? 30,
        rekeningPembayaran: data.vendor.rekeningPembayaran ?? "",
        syaratKetentuan: data.vendor.syaratKetentuan ?? "",
        themeColor: data.vendor.themeColor ?? "#0f172a",
        successMessage: data.vendor.successMessage ?? "",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), SAVED_FEEDBACK_DURATION_MS);
      toast.success("Pengaturan form booking berhasil disimpan!");
    } catch {
      setError("Gagal menyimpan pengaturan. Silakan coba lagi.");
      toast.error("Gagal menyimpan pengaturan form booking");
    } finally {
      setIsSaving(false);
    }
  }

  function handleToggle() {
    if (!isOpen) loadSettings();
    setIsOpen((v) => !v);
  }

  const vendorId = session?.user?.id;
  const bookingUrl = typeof window !== "undefined" && vendorId
    ? `${window.location.origin}/booking?v=${vendorId}`
    : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Form Booking</h2>
      <p className="mt-2 text-sm text-slate-600">
        Kelola pengaturan form booking publik untuk klien.
      </p>
      <button
        type="button"
        onClick={handleToggle}
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
      >
        {isOpen ? "Close" : "Configure"}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Aktifkan Form Booking</p>
              <p className="text-xs text-slate-500">Izinkan klien mengisi form booking secara publik</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData((f) => ({ ...f, bookingFormActive: !f.bookingFormActive }))}
              className={`relative h-6 w-11 rounded-full transition ${formData.bookingFormActive ? "bg-slate-900" : "bg-slate-200"}`}
              aria-label="Toggle booking form"
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.bookingFormActive ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Nomor WhatsApp Admin
            </label>
            <div className="flex items-center gap-2">
              <span className="rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">+</span>
              <input
                type="tel"
                value={formData.waAdmin}
                onChange={(e) => setFormData((f) => ({ ...f, waAdmin: e.target.value.replace(/\D/g, '') }))}
                placeholder="6282353345446"
                className="flex-1 rounded-r-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">Format: 628xxx (tanpa + atau spasi). Digunakan untuk tombol konfirmasi WA di form booking publik.</p>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
              DP Percentage
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {formData.dpPercentage}%
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.dpPercentage}
              onChange={(e) => setFormData((f) => ({ ...f, dpPercentage: Number(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Rekening Pembayaran DP
            </label>
            <textarea
              value={formData.rekeningPembayaran}
              onChange={(e) => setFormData((f) => ({ ...f, rekeningPembayaran: e.target.value }))}
              placeholder="Contoh: BCA 1234567890 a.n. Studio Name"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Syarat & Ketentuan
            </label>
            <textarea
              value={formData.syaratKetentuan}
              onChange={(e) => setFormData((f) => ({ ...f, syaratKetentuan: e.target.value }))}
              placeholder="Ketentuan yang berlaku untuk booking..."
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Theme Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.themeColor}
                onChange={(e) => setFormData((f) => ({ ...f, themeColor: e.target.value }))}
                className="h-10 w-20 rounded-xl border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={formData.themeColor}
                onChange={(e) => setFormData((f) => ({ ...f, themeColor: e.target.value }))}
                placeholder="#0f172a"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Success Message
            </label>
            <textarea
              value={formData.successMessage}
              onChange={(e) => setFormData((f) => ({ ...f, successMessage: e.target.value }))}
              placeholder="Terima kasih! Kami akan segera menghubungi Anda..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 resize-none"
            />
          </div>

          {bookingUrl && (
            <div className="rounded-xl bg-sky-50 p-4">
              <p className="text-sm font-medium text-sky-700 mb-2">Booking Form URL</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={bookingUrl}
                  className="flex-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(bookingUrl);
                    toast.success("URL berhasil disalin!");
                  }}
                  className="shrink-0 rounded-lg border border-sky-200 px-3 py-2 text-xs font-medium text-sky-600 hover:bg-sky-100"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

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

interface CustomField {
  id: string;
  label: string;
  tipe: "TEXT" | "TEXTAREA" | "DATE";
  isRequired: boolean;
  urutan: number;
  isActive: boolean;
}

function CustomFieldsPanel() {
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
        <FormBookingPanel />
        <CustomFieldsPanel />
      </div>
    </section>
  );
}
