"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminClients } from "@/hooks/use-admin-clients";
import { useToast } from "@/components/ui/toast";
import { ErrorState } from "@/components/ui/error-state";
import type { AdminClient } from "@/types/admin";

export const dynamic = "force-dynamic";

function ClientViewModal({ client, onClose }: { client: AdminClient; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Client Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-600">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-900">{client.name}</p>
              <p className="text-xs text-slate-500">
                Joined {new Date(client.createdAt).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-xl bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Contact Information</p>
            {[
              { label: "Email", value: client.email },
              { label: "Phone", value: client.phone },
              { label: "Instagram", value: client.instagram },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-900">{value ?? "—"}</span>
              </div>
            ))}
          </div>

          {/* Booking Summary */}
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">Booking Summary</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Bookings</span>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {client.totalBooking}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminClientsPage() {
  const { data, isLoading, error, refetch } = useAdminClients();
  const [selectedClient, setSelectedClient] = useState<AdminClient | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const toast = useToast();
  const clients = data?.items ?? [];



  const handleSelectClient = (clientId: string) => {
    const newSet = new Set(selectedClientIds);
    if (newSet.has(clientId)) {
      newSet.delete(clientId);
    } else {
      newSet.add(clientId);
    }
    setSelectedClientIds(newSet);
    setShowBulkActions(newSet.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedClientIds.size === clients.length) {
      setSelectedClientIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedClientIds(new Set(clients.map(c => c.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClientIds.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedClientIds.size} client(s)? This action cannot be undone.`)) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      const res = await fetch("/api/admin/clients/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          clientIds: Array.from(selectedClientIds),
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        if (result.code === "HAS_BOOKINGS") {
          toast.error(`Cannot delete ${result.clientsWithBookings.length} client(s) with bookings. Delete bookings first.`);
          // Show specific clients that can't be deleted
          result.clientsWithBookings.forEach((c: { name: string; bookingCount: number }) => {
            console.warn(`Client "${c.name}" has ${c.bookingCount} booking(s)`);
          });
        } else {
          toast.error(result.message ?? "Failed to delete clients");
        }
        return;
      }

      toast.success(result.message);
      setSelectedClientIds(new Set());
      setShowBulkActions(false);
      await refetch();
    } catch {
      toast.error("Failed to delete clients");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <section className="space-y-8">
      {selectedClient && (
        <ClientViewModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
      
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-3 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Info + Clear */}
            <div className="flex items-center gap-3">
              <span className="text-amber-800 font-medium text-sm">
                {selectedClientIds.size} client dipilih
              </span>
              <button
                type="button"
                onClick={() => { setSelectedClientIds(new Set()); setShowBulkActions(false); }}
                className="text-amber-600 hover:text-amber-800 text-sm font-medium underline underline-offset-2"
              >
                Batal
              </button>
            </div>
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isBulkProcessing ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-500 to-sky-700" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Client Manager
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl">
          Keep track of client information, bookings, and gallery access.
        </p>
      </header>

      {/* Error State */}
      {error && (
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-sm">
          <ErrorState message="Failed to load clients" onRetry={() => refetch()} />
        </div>
      )}

      {/* Clients Grid */}
      {!error && <div className="grid gap-5 md:grid-cols-2">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-slate-200 bg-white/50 backdrop-blur-sm p-6 shadow-sm animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-slate-200/60" />
                    <div className="space-y-2">
                      <div className="h-5 w-40 bg-slate-200/60 rounded" />
                      <div className="h-4 w-32 bg-slate-200/40 rounded" />
                    </div>
                  </div>
                  <div className="h-8 w-20 bg-slate-200/40 rounded-full" />
                </div>
              </div>
            ))}
          </>
         ) : clients.length === 0 ? (
           <div className="col-span-full">
             <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 backdrop-blur-sm p-12 text-center">
               <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                 <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                 </svg>
               </div>
               <h3 className="text-lg font-semibold text-slate-900">Belum ada klien</h3>
               <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                 Klien akan otomatis terdaftar saat booking pertama dibuat. Mulai dengan membuat booking baru.
               </p>
               <div className="mt-6">
                 <Link
                   href="/admin/events"
                   className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition"
                 >
                   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                   </svg>
                   Buat Booking Baru
                 </Link>
               </div>
             </div>
           </div>
         ) : (
           <div className="space-y-5">
             {/* Select All Header */}
             {clients.length > 1 && (
               <div className="flex items-center justify-between px-1">
                 <label className="flex items-center gap-2 text-sm text-slate-600">
                   <input
                     type="checkbox"
                     checked={selectedClientIds.size > 0 && selectedClientIds.size === clients.length}
                     onChange={handleSelectAll}
                     className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                   />
                   <span>Select all {clients.length} clients</span>
                 </label>
               </div>
             )}
             
             {clients.map((client) => (
               <div
                 key={client.id}
                 onClick={() => setSelectedClient(client)}
                 className={`group relative rounded-3xl border bg-white/70 backdrop-blur-xl p-6 shadow-sm transition-all duration-300 hover:shadow-glass hover:-translate-y-1 cursor-pointer ${
                   selectedClientIds.has(client.id)
                     ? "border-sky-400 ring-2 ring-sky-100"
                     : "border-slate-200 hover:border-white/40"
                 }`}
               >
                 {/* Checkbox overlay */}
                 <div 
                   className="absolute top-6 left-6 z-10"
                   onClick={(e) => {
                     e.stopPropagation();
                     handleSelectClient(client.id);
                   }}
                 >
                   <input
                     type="checkbox"
                     checked={selectedClientIds.has(client.id)}
                     onChange={() => handleSelectClient(client.id)}
                     className="h-5 w-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                   />
                 </div>
                 
                 <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-sky-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                 
                 <div className="relative pl-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                   <div className="flex items-center gap-4">
                     <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-lg font-bold text-slate-600 shadow-inner">
                       {client.name.charAt(0).toUpperCase()}
                     </div>
                     <div>
                       <p className="text-lg font-semibold text-slate-900 tracking-tight">
                         {client.name}
                       </p>
                       <p className="text-sm text-slate-600">
                         {client.email ?? client.phone ?? client.instagram ?? "No contact info"}
                       </p>
                       <p className="mt-1 text-xs text-slate-500">
                         Joined {new Date(client.createdAt).toLocaleDateString("id-ID", {
                           day: "2-digit",
                           month: "long",
                           year: "numeric",
                         })}
                       </p>
                     </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs font-medium text-slate-700">
                       <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                       </svg>
                       {client.totalBooking} bookings
                     </span>
                     <button
                       className="shrink-0 rounded-full border border-slate-200 bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 backdrop-blur-sm transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-slate-900"
                       type="button"
                     >
                       View
                     </button>
                   </div>
                 </div>
               </div>
             ))}
           </div>
         )}
       </div>}
     </section>
   );
 }
