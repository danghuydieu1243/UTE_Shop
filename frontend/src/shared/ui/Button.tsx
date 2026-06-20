import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-2 disabled:opacity-50',
  secondary: 'border border-line bg-surface text-ink hover:border-ink',
  ghost: 'text-ink-2 hover:text-ink',
};

export const Button = ({ variant = 'primary', loading, children, className = '', disabled, ...rest }: Props) => (
  <button
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded px-5 py-2.5 text-[11px] font-medium uppercase tracking-[1.5px] transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    {...rest}
  >
    {loading ? 'ĐANG XỬ LÝ…' : children}
  </button>
);
