/**
 * useToast — hook toast dùng chung cho toàn bộ app.
 * Mỗi toast hiển thị 3 giây rồi tự mất.
 * Trả về { show, ToastLayer }: gọi show(msg) để hiện toast, render <ToastLayer /> trong JSX.
 * show(msg, { action, onAction }) — tuỳ chọn hiển thị nút hành động (vd: "Hoàn tác").
 */
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  msg: string;
  description?: string;
  action?: ToastAction;
  onClick?: () => void;
}

type ToastPosition = 'bottom-center' | 'top-right';

interface UseToastOptions {
  position?: ToastPosition;
}

const POSITION_CLASSES: Record<ToastPosition, string> = {
  'bottom-center': 'fixed bottom-8 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none',
  'top-right': 'fixed right-6 top-6 z-[9999] flex flex-col items-end gap-2 pointer-events-none',
};

export const useToast = (options?: UseToastOptions) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const position = options?.position ?? 'bottom-center';

  const show = (msg: string, opts?: { action?: ToastAction; description?: string; onClick?: () => void }) => {
    const id = ++counter.current;
    // Giới hạn tối đa 3 toast: khi spam, giữ 2 toast mới nhất + toast vừa thêm,
    // bỏ những toast cũ hơn để không tràn màn hình.
    setToasts((prev) => [
      ...prev.slice(-2),
      { id, msg, description: opts?.description, action: opts?.action, onClick: opts?.onClick },
    ]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Render qua portal tới document.body: nếu render trong cây có tổ tiên dùng
  // `transform` (vd card `.reveal` ở Home), `position: fixed` sẽ neo theo phần tử
  // đó thay vì viewport → toast hiện sai chỗ. Portal đưa toast ra ngoài, neo theo viewport.
  const ToastLayer = () => {
    if (typeof document === 'undefined') return null;
    return createPortal(
      <div className={POSITION_CLASSES[position]}>
        {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-[toastIn_.4s_ease_forwards] bg-ink px-5 py-3 text-[13px] tracking-[.2px] text-paper pointer-events-auto ${
            t.onClick ? 'cursor-pointer' : ''
          }`}
          style={{ borderRadius: 0 }}
          onClick={() => {
            t.onClick?.();
            dismiss(t.id);
          }}
          role={t.onClick ? 'button' : undefined}
          tabIndex={t.onClick ? 0 : undefined}
          onKeyDown={(e) => {
            if (!t.onClick) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              t.onClick();
              dismiss(t.id);
            }
          }}
        >
          <div className="min-w-0">
            <p className="font-medium leading-5">{t.msg}</p>
            {t.description && <p className="mt-1 text-[12px] leading-4 text-paper/80">{t.description}</p>}
          </div>
          {t.action && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
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
      </div>,
      document.body,
    );
  };

  return { show, ToastLayer };
};
