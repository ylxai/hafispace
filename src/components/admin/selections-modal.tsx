"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useToast } from "@/components/ui/toast";

function extractCloudName(url: string): string {
  try {
    const match = url.match(/res\.cloudinary\.com\/([^/]+)\//);
    return match?.[1] ?? "doweertbx";
  } catch {
    return "doweertbx";
  }
}

function extractPublicId(url: string): string {
  try {
    const match = url.match(/\/upload\/(.+)$/);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

function generateThumbnailUrl(url: string): string {
  const cloudName = extractCloudName(url);
  const publicId = extractPublicId(url);
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto,h_400,q_auto:good,w_400/${publicId}`;
}

interface SelectedPhoto {
  id: string;
  fileId: string;
  filename: string;
  selectionType: "EDIT" | "PRINT";
  printSize: string | null;
  selectedAt: string;
  isLocked: boolean;
  lockedAt: string | null;
  thumbnailUrl: string | null;
  url: string | null;
}

interface SelectionStats {
  total: number;
  edit: number;
  print: number;
  locked: number;
}

interface SelectionsModalProps {
  galleryId: string;
  onClose: () => void;
}

export function SelectionsModal({ galleryId, onClose }: SelectionsModalProps) {
  const toast = useToast();
  const [selections, setSelections] = useState<SelectedPhoto[]>([]);
  const [stats, setStats] = useState<SelectionStats>({ total: 0, edit: 0, print: 0, locked: 0 });
  const [filter, setFilter] = useState<"all" | "locked" | "unlocked" | "edit" | "print">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [selectedSelectionIds, setSelectedSelectionIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"lock" | "unlock" | "delete" | "changeType" | null>(null);
  const [bulkSelectionType, setBulkSelectionType] = useState<"EDIT" | "PRINT" | "">("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const fetchSelections = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/galleries/${galleryId}/selections`);
      if (!res.ok) throw new Error("Failed to fetch selections");
      const data = await res.json();
      setSelections(data.selections);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching selections:", error);
      toast.error("Failed to load selections");
    } finally {
      setIsLoading(false);
    }
  }, [galleryId, toast]);

  useEffect(() => {
    fetchSelections();
  }, [fetchSelections]);

  const handleSelectSelection = (selectionId: string) => {
    const newSet = new Set(selectedSelectionIds);
    if (newSet.has(selectionId)) {
      newSet.delete(selectionId);
    } else {
      newSet.add(selectionId);
    }
    setSelectedSelectionIds(newSet);
    setShowBulkActions(newSet.size > 0);
  };

  const filteredSelections = selections.filter((s) => {
    if (filter === "locked") return s.isLocked;
    if (filter === "unlocked") return !s.isLocked;
    if (filter === "edit") return s.selectionType === "EDIT";
    if (filter === "print") return s.selectionType === "PRINT";
    return true;
  });

  const handleSelectAll = () => {
    if (selectedSelectionIds.size === filteredSelections.length) {
      setSelectedSelectionIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedSelectionIds(new Set(filteredSelections.map(s => s.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = async () => {
    if (selectedSelectionIds.size === 0 || !bulkActionType) return;

    setIsBulkProcessing(true);
    try {
      const actionData: {
        selectionIds: string[];
        isLocked?: boolean;
        selectionType?: string;
      } = { selectionIds: Array.from(selectedSelectionIds) };
      
      if (bulkActionType === "lock") {
        actionData.isLocked = true;
      } else if (bulkActionType === "unlock") {
        actionData.isLocked = false;
      } else if (bulkActionType === "delete") {
        // For delete, we don't need additional data
      } else if (bulkActionType === "changeType" && bulkSelectionType) {
        actionData.selectionType = bulkSelectionType;
      }

      const res = await fetch(`/api/admin/galleries/${galleryId}/selections/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: bulkActionType === "delete" ? "delete" : "update",
          ...actionData,
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        toast.error(result.message ?? `Failed to ${bulkActionType} selections`);
        return;
      }

      toast.success(result.message);
      setSelectedSelectionIds(new Set());
      setShowBulkActions(false);
      setBulkActionType(null);
      setBulkSelectionType("");
      await fetchSelections(); // Refresh data
    } catch {
      toast.error("Failed to perform bulk action");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleToggleLock = async (selectionId: string, currentLockState: boolean) => {
    setActionInProgress(selectionId);
    try {
      const res = await fetch(`/api/admin/galleries/${galleryId}/selections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectionId, isLocked: !currentLockState }),
      });

      if (!res.ok) throw new Error("Failed to update selection");

      const data = await res.json();
      setSelections((prev) =>
        prev.map((s) =>
          s.id === selectionId
            ? { ...s, isLocked: data.selection.isLocked, lockedAt: data.selection.lockedAt }
            : s
        )
      );
      setStats((prev) => ({
        ...prev,
        locked: currentLockState ? prev.locked - 1 : prev.locked + 1,
      }));
      toast.success(`Selection ${currentLockState ? "unlocked" : "locked"}`);
    } catch (error) {
      console.error("Error toggling lock:", error);
      toast.error("Failed to update selection");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (selectionId: string, filename: string) => {
    if (!window.confirm(`Remove ${filename} from selections?`)) return;

    setActionInProgress(selectionId);
    try {
      const res = await fetch(`/api/admin/galleries/${galleryId}/selections`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectionId }),
      });

      if (!res.ok) throw new Error("Failed to delete selection");

      setSelections((prev) => prev.filter((s) => s.id !== selectionId));
      setStats((prev) => ({
        total: prev.total - 1,
        edit: selections.find((s) => s.id === selectionId)?.selectionType === "EDIT" ? prev.edit - 1 : prev.edit,
        print: selections.find((s) => s.id === selectionId)?.selectionType === "PRINT" ? prev.print - 1 : prev.print,
        locked: selections.find((s) => s.id === selectionId)?.isLocked ? prev.locked - 1 : prev.locked,
      }));
      toast.success("Selection removed");
    } catch (error) {
      console.error("Error deleting selection:", error);
      toast.error("Failed to remove selection");
    } finally {
      setActionInProgress(null);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-amber-50 border border-amber-200 rounded-xl p-4 w-[90%] max-w-4xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-amber-800 font-medium">
                  {selectedSelectionIds.size} selection(s) selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSelectionIds(new Set())}
                  className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                >
                  Clear selection
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkActions(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={bulkActionType ?? ""}
                onChange={(e) => setBulkActionType(e.target.value as "delete" | "lock" | "unlock" | "changeType" | null)}
                className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-400"
              >
                <option value="">Select action</option>
                <option value="lock">Lock Selected</option>
                <option value="unlock">Unlock Selected</option>
                <option value="delete">Delete Selected</option>
                <option value="changeType">Change Type</option>
              </select>
              {bulkActionType === "changeType" && (
                <select
                  value={bulkSelectionType}
                  onChange={(e) => setBulkSelectionType(e.target.value as "EDIT" | "PRINT")}
                  className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-400"
                >
                  <option value="">Select type</option>
                  <option value="EDIT">Edit</option>
                  <option value="PRINT">Print</option>
                </select>
              )}
              <button
                type="button"
                onClick={handleBulkAction}
                disabled={!bulkActionType || (bulkActionType === "changeType" && !bulkSelectionType) || isBulkProcessing}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              Photo Selections
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {stats.total} photo(s) selected by client
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 py-3 text-sm text-slate-600 border-b border-slate-200">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-slate-900">{stats.total}</span> Total
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-green-600">{stats.locked}</span> Submitted
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-slate-400">{stats.total - stats.locked}</span> Menunggu
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 py-4 border-b border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter("edit")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === "edit"
                ? "bg-sky-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Edit ({stats.edit})
          </button>
          <button
            type="button"
            onClick={() => setFilter("print")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === "print"
                ? "bg-purple-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Print ({stats.print})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unlocked")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === "unlocked"
                ? "bg-slate-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Menunggu
          </button>
          <button
            type="button"
            onClick={() => setFilter("locked")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === "locked"
                ? "bg-green-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Submitted
          </button>
        </div>

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
              <p className="mt-4 text-sm text-slate-500">Loading selections...</p>
            </div>
          ) : filteredSelections.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-slate-600">No photos found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All Header */}
              {filteredSelections.length > 1 && (
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedSelectionIds.size > 0 && selectedSelectionIds.size === filteredSelections.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                    <span>Select all {filteredSelections.length} selections</span>
                  </label>
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredSelections.map((selection) => {
                  const thumbnailUrl = selection.thumbnailUrl
                    ? generateThumbnailUrl(selection.url ?? selection.thumbnailUrl)
                    : "/api/placeholder/400/400";
                  
                  return (
                    <div
                      key={selection.id}
                      className={`group relative rounded-xl overflow-hidden border bg-slate-50 transition-all duration-200 ${
                        selectedSelectionIds.has(selection.id)
                          ? "border-sky-500 ring-2 ring-sky-100"
                          : "border-slate-200"
                      }`}
                    >
                      {/* Checkbox overlay */}
                      <div 
                        className="absolute top-2 right-2 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSelection(selection.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSelectionIds.has(selection.id)}
                          onChange={() => handleSelectSelection(selection.id)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                        />
                      </div>
                      
                      {/* Image */}
                      <div className="aspect-square relative">
                        <Image
                          src={thumbnailUrl}
                          alt={selection.filename}
                          fill
                          className="object-cover"
                          unoptimized
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/api/placeholder/400/400";
                          }}
                        />
                        
                        {/* Lock overlay */}
                        {selection.isLocked && (
                          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        )}

                        {/* Loading overlay */}
                        {actionInProgress === selection.id && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className="text-xs font-medium text-slate-700 truncate" title={selection.filename}>
                          {selection.filename}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            selection.selectionType === "EDIT"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-purple-100 text-purple-700"
                          }`}>
                            {selection.selectionType}
                          </span>
                          <span className="text-xs text-slate-500" title={`Selected: ${new Date(selection.selectedAt).toLocaleString()}`}>
                            {new Date(selection.selectedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleLock(selection.id, selection.isLocked)}
                            disabled={actionInProgress === selection.id}
                            title={selection.isLocked ? `Dikunci pada ${selection.lockedAt ? new Date(selection.lockedAt).toLocaleString("id-ID") : "-"}` : "Belum dikonfirmasi klien"}
                            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                              selection.isLocked
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {selection.isLocked ? "✓ Submitted" : "Menunggu"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(selection.id, selection.filename)}
                            disabled={actionInProgress === selection.id}
                            className="rounded-lg bg-red-100 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                            aria-label={`Delete ${selection.filename}`}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">
              <span className="font-semibold text-green-600">{stats.locked}</span> submitted
            </span>
            <span className="text-slate-600">
              <span className="font-semibold text-slate-400">{stats.total - stats.locked}</span> menunggu
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {/* Download list daftar nama foto */}
            {selections.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const content = selections
                    .map((s, i) => `${i + 1}. ${s.filename}`)
                    .join("\n");
                  const blob = new Blob([content], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `seleksi-foto.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download List
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
