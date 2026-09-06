import React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white border border-[#EAECF0] rounded-2xl p-5 shadow-2xl text-[#1E222D] transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold ${
              isDestructive
                ? "bg-[#FDF2F2] text-[#EB5757] border border-[#EB5757]/20"
                : "bg-[#E6F9F5] text-[#00B386] border border-[#00B386]/20"
            }`}
          >
            {isDestructive ? "🗑️" : "ℹ️"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[#1E222D]">{title}</h3>
            <p className="text-xs text-[#7C7E8C] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#44475B] bg-[#F4F6F8] hover:bg-[#EAECF0] border border-[#EAECF0] transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isDestructive
                ? "bg-[#EB5757] hover:bg-[#D94F4F]"
                : "bg-[#00D09C] hover:bg-[#00B386]"
            }`}
          >
            {isLoading && (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{isLoading ? "Removing..." : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
