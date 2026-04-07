import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY_PREFIX = "gallery-selection:";

function getStorageKey(token: string): string {
  return `${STORAGE_KEY_PREFIX}${token}`;
}

function readFromStorage(token: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(token));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeToStorage(token: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(token), JSON.stringify(ids));
  } catch {
    // localStorage full or unavailable — non-critical
  }
}

/**
 * Helper: ambil local selections dari localStorage tanpa hook.
 * Bisa dipakai di luar React (misalnya sebelum mount).
 */
export function getLocalSelections(token: string): string[] {
  return readFromStorage(token);
}

/**
 * Helper: hapus local selections dari localStorage setelah submit.
 */
export function clearLocalSelections(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(token));
  } catch {
    // non-critical
  }
}

interface UseLocalSelectionOptions {
  token: string;
  maxSelection: number;
  /** Jika true, hook tidak melakukan apa-apa (gallery locked) */
  disabled?: boolean;
}

interface UseLocalSelectionReturn {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  selectAll: (availableIds: string[]) => void;
  clearAll: () => void;
  count: number;
  isMaxed: boolean;
}

export function useLocalSelection({
  token,
  maxSelection,
  disabled = false,
}: UseLocalSelectionOptions): UseLocalSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(readFromStorage(token));
  });

  // Track prev token untuk reset saat token berubah
  const prevTokenRef = useRef(token);
  useEffect(() => {
    if (prevTokenRef.current !== token) {
      prevTokenRef.current = token;
      setSelectedIds(new Set(readFromStorage(token)));
    }
  }, [token]);

  // Persist ke localStorage setiap kali selectedIds berubah
  useEffect(() => {
    writeToStorage(token, Array.from(selectedIds));
  }, [token, selectedIds]);

  // Cross-tab sync: dengarkan storage event dari tab lain
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== getStorageKey(token)) return;
      if (e.newValue === null) {
        // Data dihapus di tab lain
        setSelectedIds(new Set());
      } else {
        try {
          const parsed: unknown = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setSelectedIds(
              new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0))
            );
          }
        } catch {
          // corrupt data — ignore
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [token]);

  const toggle = useCallback(
    (id: string) => {
      if (disabled) return;

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (next.size >= maxSelection) return prev; // quota penuh, ignore
          next.add(id);
        }
        return next;
      });
    },
    [disabled, maxSelection]
  );

  const selectAll = useCallback(
    (availableIds: string[]) => {
      if (disabled) return;

      setSelectedIds((prev) => {
        // Ambil dari availableIds yang belum terseleksi, batasi ke maxSelection
        const next = new Set(prev);
        for (const id of availableIds) {
          if (next.size >= maxSelection) break;
          next.add(id);
        }
        return next;
      });
    },
    [disabled, maxSelection]
  );

  const clearAll = useCallback(() => {
    if (disabled) return;
    setSelectedIds(new Set());
  }, [disabled]);

  return {
    selectedIds,
    toggle,
    selectAll,
    clearAll,
    count: selectedIds.size,
    isMaxed: selectedIds.size >= maxSelection,
  };
}
