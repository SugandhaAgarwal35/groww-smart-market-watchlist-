import React, { useEffect } from "react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title?: string;
  message: string;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    if (!latest) return;

    const timer = setTimeout(() => {
      onDismiss(latest.id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md animate-slide-up transition-all ${
              isSuccess
                ? "bg-white border-[#00B386]/30 text-[#1E222D]"
                : isError
                ? "bg-white border-[#EB5757]/30 text-[#1E222D]"
                : "bg-white border-[#EAECF0] text-[#1E222D]"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isSuccess
                  ? "bg-[#E6F9F5] text-[#00B386]"
                  : isError
                  ? "bg-[#FDF2F2] text-[#EB5757]"
                  : "bg-[#F4F6F8] text-[#44475B]"
              }`}
            >
              {isSuccess ? "✓" : isError ? "✕" : "ℹ"}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <div className="text-xs font-bold text-[#1E222D]">{toast.title}</div>
              )}
              <div className="text-xs text-[#44475B] mt-0.5 leading-snug">{toast.message}</div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#7C7E8C] hover:text-[#1E222D] text-xs p-1 rounded-md transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};
