import { forwardRef, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className = '', ...rest }, ref) => (
  <label className="block">
    {label && (
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[1.5px] text-ink-2">{label}</span>
    )}
    <input
      ref={ref}
      className={`w-full rounded border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink ${error ? 'border-danger-fg' : 'border-line'} ${className}`}
      {...rest}
    />
    {error && <span className="mt-1 block text-xs text-danger-fg">{error}</span>}
  </label>
));
Input.displayName = 'Input';
