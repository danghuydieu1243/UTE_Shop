/**
 * useToast — hook toast dùng chung cho toàn bộ app.
 * Mỗi toast hiển thị 3 giây rồi tự mất.
 * Trả về { show, ToastLayer }: gọi show(msg) để hiện toast, render <ToastLayer /> trong JSX.
 * show(msg, { action, onAction }) — tuỳ chọn hiển thị nút hành động (vd: "Hoàn tác").
 */
import { useState, useRef } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  msg: string;
  action?: ToastAction;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = (msg: string, opts?: { action?: ToastAction }) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, msg, action: opts?.action }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const ToastLayer = () => (
    <div className="fixed bottom-8 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 animate-[toastIn_.4s_ease_forwards] bg-ink px-5 py-3 text-[13px] tracking-[.2px] text-paper pointer-events-auto"
          style={{ borderRadius: 0 }}
        >
          <span>{t.msg}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="ml-1 text-[12px] font-semibold underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return { show, ToastLayer };
};
