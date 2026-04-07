"use client";

import { Check, Send, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectionBottomBarProps {
  selectedCount: number;
  maxSelection: number;
  isMaxed: boolean;
  isLocked: boolean;
  onClearAll: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

/**
 * Sticky bottom bar for photo selection
 * Provides clear visual feedback and easy access to actions
 * Mobile-optimized with large touch targets
 */
export function SelectionBottomBar({
  selectedCount,
  maxSelection,
  isMaxed,
  isLocked,
  onClearAll,
  onSubmit,
  isSubmitting = false,
}: SelectionBottomBarProps) {
  // Don't show if locked (selections submitted)
  if (isLocked || selectedCount === 0) {
    return null;
  }

  const progress = (selectedCount / maxSelection) * 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-50 safe-area-bottom">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className={cn(
            "h-full transition-all duration-300",
            isMaxed ? "bg-green-500" : "bg-blue-500"
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Counter */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center",
              "w-10 h-10 sm:w-12 sm:h-12",
              "rounded-full",
              isMaxed ? "bg-green-100" : "bg-blue-100"
            )}>
              <Check className={cn(
                "w-5 h-5 sm:w-6 sm:h-6",
                isMaxed ? "text-green-600" : "text-blue-600"
              )} />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold">
                  {selectedCount} / {maxSelection}
                </span>
                {isMaxed && (
                  <span className="text-xs sm:text-sm px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    Maksimal
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                {isMaxed 
                  ? "Sudah mencapai maksimal" 
                  : `${maxSelection - selectedCount} foto lagi`
                }
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClearAll}
              className={cn(
                "flex items-center gap-2",
                "px-3 sm:px-4 py-2 sm:py-2.5",
                "rounded-lg border border-gray-300",
                "bg-white hover:bg-gray-50",
                "transition-colors duration-200",
                "text-sm sm:text-base font-medium",
                "active:scale-95"
              )}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              onClick={onSubmit}
              disabled={selectedCount === 0 || isSubmitting}
              className={cn(
                "flex items-center gap-2",
                "px-4 sm:px-6 py-2 sm:py-2.5",
                "rounded-lg",
                "bg-blue-600 hover:bg-blue-700",
                "text-white font-semibold",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "active:scale-95",
                "shadow-lg shadow-blue-500/30"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit ({selectedCount})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile helper text */}
        <p className="text-xs text-gray-500 mt-2 text-center sm:hidden">
          Tekan foto untuk preview, Shift+klik untuk pilih
        </p>
      </div>
    </div>
  );
}
