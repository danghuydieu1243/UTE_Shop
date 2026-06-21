/**
 * useToast — hook toast dùng chung cho toàn bộ app.
 * Mỗi toast hiển thị 3 giây rồi tự mất.
 * Trả về { show, ToastLayer }: gọi show(msg) để hiện toast, render <ToastLayer /> trong JSX.
 */
import { useState, useRef } from 'react';

interface ToastItem {
  id: number;
  msg: string;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = (msg: string) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const ToastLayer = () => (
    <div className="fixed bottom-8 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-[toastIn_.4s_ease_forwards] bg-ink px-5 py-3 text-[13px] tracking-[.2px] text-paper"
          style={{ borderRadius: 0 }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );

  return { show, ToastLayer };
};
