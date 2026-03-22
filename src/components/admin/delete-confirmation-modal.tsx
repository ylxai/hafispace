"use client";

type DeleteConfirmationModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteConfirmationModal({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isDangerous = true,
  onConfirm,
  onCancel
}: DeleteConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold text-white transition ${
              isDangerous
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
